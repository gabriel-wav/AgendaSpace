import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import * as webpushModule from 'web-push';
const webpush: any = (webpushModule as any).default || webpushModule;

@Injectable()
export class PushWorker {
  private readonly logger = new Logger(PushWorker.name);
  private readonly instanceId = crypto.randomUUID();

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async processPushOutbox() {
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + 2 * 60000); // 2 minutos de lease

    // Trava atômica com raw query para garantir concorrência segura entre instâncias
    const updatedRows = await this.prisma.$executeRaw`
      UPDATE push_outbox 
      SET status = 'PROCESSING', 
          locked_by = ${this.instanceId}, 
          locked_until = ${lockedUntil}
      WHERE (status = 'PENDING' AND next_attempt_at <= ${now})
         OR (status = 'PROCESSING' AND locked_until <= ${now})
      ORDER BY next_attempt_at ASC
      LIMIT 10
    `;

    if (updatedRows === 0) return;

    const items = await this.prisma.pushOutbox.findMany({
      where: {
        status: 'PROCESSING',
        lockedBy: this.instanceId,
      },
      include: {
        user: {
          include: {
            preference: true,
            pushSubscriptions: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    for (const item of items) {
      try {
        // 1. Revalidação da preferência da conta antes do envio
        const userPref = item.user.preference;
        if (!userPref?.pushNotifications) {
          await this.prisma.pushOutbox.update({
            where: { id: item.id },
            data: {
              status: 'SENT',
              error: 'Suprimido: o usuário desativou notificações push nas preferências da conta.',
              lockedBy: null,
              lockedUntil: null,
              attempts: item.attempts + 1,
            },
          });
          continue;
        }

        const subscriptions = item.user.pushSubscriptions;
        if (!subscriptions || subscriptions.length === 0) {
          await this.prisma.pushOutbox.update({
            where: { id: item.id },
            data: {
              status: 'SENT',
              error: 'Nenhum dispositivo ativo inscrito para este usuário.',
              lockedBy: null,
              lockedUntil: null,
              attempts: item.attempts + 1,
            },
          });
          continue;
        }

        // 2. Construção do payload com IDs para deduplicação e navegação segura
        const pushPayload = JSON.stringify({
          id: item.notificationId || item.id,
          notificationId: item.notificationId || item.id,
          referenceId: item.referenceId,
          type: item.type,
          title: item.title,
          body: item.body,
          url: item.url || '/notifications',
        });

        let successCount = 0;
        let transientFailureCount = 0;
        let lastErrorMsg = '';

        for (const sub of subscriptions) {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth,
                },
              },
              pushPayload,
              {
                TTL: 86400, // 24 horas no gateway de push
              },
            );
            successCount++;
          } catch (err: any) {
            const statusCode = err.statusCode || err.status;
            // 3. Tratamento de assinatura expirada ou removida (404/410/400)
            if (statusCode === 404 || statusCode === 410 || statusCode === 400) {
              this.logger.warn(
                `Assinatura de push expirada/inválida (HTTP ${statusCode}). Desativando assinatura id ${sub.id} para usuário ${item.userId}.`,
              );
              // Desativa a assinatura expirada sem afetar as outras do mesmo usuário nem as notificações in-app
              await this.prisma.pushSubscription.update({
                where: { id: sub.id },
                data: { isActive: false },
              });
            } else {
              this.logger.error(`Falha transitória ao enviar push para dispositivo ${sub.id}: ${err.message}`);
              transientFailureCount++;
              lastErrorMsg = err.message;
            }
          }
        }

        // Se ao menos uma assinatura teve sucesso, ou se todas expiradas foram limpas
        if (successCount > 0 || (subscriptions.length > 0 && transientFailureCount === 0)) {
          await this.prisma.pushOutbox.update({
            where: { id: item.id },
            data: {
              status: 'SENT',
              error: `Enviado com sucesso para ${successCount} de ${subscriptions.length} dispositivo(s).`,
              lockedBy: null,
              lockedUntil: null,
              attempts: item.attempts + 1,
            },
          });
        } else {
          // Apenas erros de rede transitórios
          const newAttempts = item.attempts + 1;
          const isFailed = newAttempts >= item.maxAttempts;
          const backoffMinutes = Math.pow(5, newAttempts - 1);
          const nextAttemptAt = new Date(Date.now() + backoffMinutes * 60000);

          await this.prisma.pushOutbox.update({
            where: { id: item.id },
            data: {
              status: isFailed ? 'FAILED' : 'PENDING',
              error: lastErrorMsg || 'Falha transitória na entrega push.',
              attempts: newAttempts,
              nextAttemptAt: isFailed ? item.nextAttemptAt : nextAttemptAt,
              lockedBy: null,
              lockedUntil: null,
            },
          });
        }
      } catch (err: any) {
        this.logger.error(`Erro inesperado ao processar push ${item.id}: ${err.message}`);
        await this.prisma.pushOutbox.update({
          where: { id: item.id },
          data: {
            status: item.attempts + 1 >= item.maxAttempts ? 'FAILED' : 'PENDING',
            error: err.message,
            attempts: item.attempts + 1,
            lockedBy: null,
            lockedUntil: null,
          },
        });
      }
    }
  }
}
