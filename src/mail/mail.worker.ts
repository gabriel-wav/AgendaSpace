import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';
import { TEMPLATES } from './mail.templates';
import { decryptPayload } from './crypto.util';
import * as crypto from 'crypto';

@Injectable()
export class MailWorker {
  private readonly logger = new Logger(MailWorker.name);
  private readonly instanceId = crypto.randomUUID();

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async processOutbox() {
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + 2 * 60000); // 2 minutos de lease

    // Usando Raw Query para obter atomicity na trava (lease) dos emails a serem enviados
    // Previne que múltiplas instâncias processem a mesma mensagem simultaneamente.
    const updatedRows = await this.prisma.$executeRaw`
      UPDATE email_outbox 
      SET status = 'PROCESSING', 
          locked_by = ${this.instanceId}, 
          locked_until = ${lockedUntil}
      WHERE (status = 'PENDING' AND next_attempt_at <= ${now})
         OR (status = 'PROCESSING' AND locked_until <= ${now})
      ORDER BY next_attempt_at ASC
      LIMIT 10
    `;

    if (updatedRows === 0) return;

    const emailsToProcess = await this.prisma.emailOutbox.findMany({
      where: {
        status: 'PROCESSING',
        lockedBy: this.instanceId,
      }
    });

    for (const email of emailsToProcess) {
      try {
        const key = process.env.MAIL_ENCRYPTION_KEY;
        const payload = decryptPayload(email.payload, key);
        const template = TEMPLATES[email.templateName as keyof typeof TEMPLATES];
        
        if (!template) throw new Error(`Template ausente: ${email.templateName}`);

        // Consulte a preferência atual antes do envio opcional
        const userPrefs = await this.prisma.userPreference.findFirst({
          where: { user: { email: email.recipient } },
        });

        let shouldSend = true;
        if (userPrefs) {
          const tpl = email.templateName;
          if (tpl.startsWith('BOOKING_') && tpl !== 'BOOKING_REMINDER') {
            shouldSend = userPrefs.emailBookings;
          } else if (tpl === 'BOOKING_REMINDER') {
            shouldSend = userPrefs.emailReminders;
          } else if (tpl === 'LOGIN_ALERT') {
            shouldSend = userPrefs.loginAlerts;
          } else if (!['EMAIL_CONFIRMATION', 'PASSWORD_RESET', 'PASSWORD_RECOVERY', 'PASSWORD_CHANGED', 'TWO_FACTOR_CODE', 'RECOVERY_CODES', 'SECURITY_ALERT'].includes(tpl)) {
            // General optional notifications fallback
            shouldSend = userPrefs.emailNotifications;
          }
        }

        if (!shouldSend) {
          await this.prisma.emailOutbox.update({
            where: { id: email.id },
            data: {
              status: 'SENT', // Consideramos enviado/resolvido para sair da fila
              error: 'Suprimido pelas preferências do usuário.',
              lockedBy: null,
              lockedUntil: null,
              attempts: email.attempts + 1,
            }
          });
          continue;
        }

        const html = template.html(payload);
        const text = template.text(payload);
        
        const mailOptions = {
          from: process.env.MAIL_FROM || 'AgendaSpace <noreply@agendaspace.local>',
          to: email.recipient,
          subject: email.subject,
          html,
          text,
        };

        const transporter = this.mailService.getTransporter();
        const info = await transporter.sendMail(mailOptions);

        await this.prisma.emailOutbox.update({
          where: { id: email.id },
          data: {
            status: 'SENT',
            error: `MessageId: ${info.messageId} - Aceito pelo SMTP`,
            lockedBy: null,
            lockedUntil: null,
            attempts: email.attempts + 1,
          }
        });

      } catch (err: any) {
        this.logger.error(`Falha ao enviar email ${email.id}: ${err.message}`);
        
        const newAttempts = email.attempts + 1;
        const isFailed = newAttempts >= email.maxAttempts;
        
        // Backoff simples: 1 min, 5 min, 25 min...
        const backoffMinutes = Math.pow(5, newAttempts - 1); 
        const nextAttemptAt = new Date(new Date().getTime() + backoffMinutes * 60000);

        await this.prisma.emailOutbox.update({
          where: { id: email.id },
          data: {
            status: isFailed ? 'FAILED' : 'PENDING',
            error: err.message,
            attempts: newAttempts,
            nextAttemptAt: isFailed ? email.nextAttemptAt : nextAttemptAt,
            lockedBy: null,
            lockedUntil: null,
          }
        });
      }
    }
  }
}
