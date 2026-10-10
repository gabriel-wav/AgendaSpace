import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscribePushDto } from './dto/push-subscription.dto';
import { validatePushEndpoint } from './push-validator.util';
import * as crypto from 'crypto';
import * as webpushModule from 'web-push';
const webpush: any = (webpushModule as any).default || webpushModule;

export interface PushPayload {
  id?: string;
  notificationId?: string;
  referenceId?: string | null;
  type?: string;
  title: string;
  body: string;
  url?: string;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private vapidConfigured = false;

  constructor(private readonly prisma: PrismaService) {
    this.initVapid();
  }

  private initVapid() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.PRIVATE_VAPID_KEY || process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:contato@agendaspace.local';

    if (publicKey && privateKey) {
      try {
        webpush.setVapidDetails(subject, publicKey, privateKey);
        this.vapidConfigured = true;
        this.logger.log('VAPID Web Push configurado com sucesso.');
      } catch (err: any) {
        this.logger.error(`Erro ao inicializar VAPID Web Push: ${err.message}`);
      }
    } else {
      this.logger.warn('Chaves VAPID não configuradas nas variáveis de ambiente. Envios de Web Push não serão processados.');
    }
  }

  getPublicKey(): { publicKey: string } {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
      throw new BadRequestException('Chave pública VAPID não configurada no servidor.');
    }
    return { publicKey };
  }

  hashEndpoint(endpoint: string): string {
    return crypto.createHash('sha256').update(endpoint).digest('hex');
  }

  /**
   * Registra ou reativa uma assinatura push vinculada ao usuário autenticado.
   * Valida SSRF no endpoint e previne vazamento entre usuários no mesmo navegador.
   */
  async subscribe(userId: string, dto: SubscribePushDto, userAgent?: string) {
    validatePushEndpoint(dto.endpoint);

    const endpointHash = this.hashEndpoint(dto.endpoint);

    // Salva ou atualiza a assinatura para o usuário autenticado
    const subscription = await this.prisma.pushSubscription.upsert({
      where: { endpointHash },
      update: {
        userId, // Se outro usuário usava este dispositivo, a assinatura é transferida
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        deviceInfo: dto.deviceInfo || 'Navegador Web',
        userAgent: userAgent || null,
        isActive: true,
      },
      create: {
        userId,
        endpointHash,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        deviceInfo: dto.deviceInfo || 'Navegador Web',
        userAgent: userAgent || null,
        isActive: true,
      },
      select: {
        id: true,
        deviceInfo: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Garante que a preferência do usuário de push está ativa
    await this.prisma.userPreference.upsert({
      where: { userId },
      update: { pushNotifications: true },
      create: { userId, pushNotifications: true },
    });

    this.logger.log(`Dispositivo inscrito para push com sucesso: Usuário ${userId}, Dispositivo: ${subscription.deviceInfo}`);

    return {
      success: true,
      subscription,
    };
  }

  /**
   * Desativa a assinatura deste dispositivo específico para o usuário autenticado.
   * Não desativa assinaturas de outros dispositivos do mesmo usuário.
   */
  async unsubscribe(userId: string, endpoint: string) {
    if (!endpoint) {
      throw new BadRequestException('Endpoint é obrigatório para cancelar a inscrição.');
    }

    const endpointHash = this.hashEndpoint(endpoint);

    const existing = await this.prisma.pushSubscription.findFirst({
      where: { endpointHash, userId },
    });

    if (existing) {
      await this.prisma.pushSubscription.delete({
        where: { id: existing.id },
      });
      this.logger.log(`Assinatura removida para o dispositivo ${existing.id} do usuário ${userId}.`);
    }

    return { success: true };
  }

  /**
   * Retorna assinaturas ativas do usuário, protegendo chaves de criptografia.
   */
  async getSubscriptions(userId: string) {
    const list = await this.prisma.pushSubscription.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        deviceInfo: true,
        createdAt: true,
        updatedAt: true,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return list;
  }

  /**
   * Enfileira uma notificação push na tabela push_outbox de forma atômica.
   */
  async queuePush(
    prismaOrTx: any,
    data: {
      userId: string;
      notificationId?: string;
      referenceId?: string | null;
      type: string;
      title: string;
      body: string;
      url?: string;
      idempotencyKey?: string;
    },
  ) {
    const client = prismaOrTx || this.prisma;
    try {
      return await client.pushOutbox.create({
        data: {
          userId: data.userId,
          notificationId: data.notificationId || null,
          referenceId: data.referenceId || null,
          type: data.type,
          title: data.title,
          body: data.body,
          url: data.url || '/notifications',
          idempotencyKey: data.idempotencyKey || null,
        },
      });
    } catch (err: any) {
      // Se for violação de chave única idempotencyKey, ignorar silenciosamente
      if (err.code === 'P2002') {
        this.logger.debug(`Push com idempotencyKey já existente ignorado: ${data.idempotencyKey}`);
        return null;
      }
      throw err;
    }
  }

  /**
   * Envia uma mensagem push de teste para os dispositivos do usuário autenticado.
   */
  async sendTestPush(userId: string) {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId, isActive: true },
    });

    if (subscriptions.length === 0) {
      throw new NotFoundException('Nenhum dispositivo ativo encontrado para este usuário.');
    }

    // Enfileira na outbox para envio imediato e rastreabilidade
    await this.queuePush(this.prisma, {
      userId,
      type: 'SYSTEM_TEST',
      title: 'Teste de Web Push',
      body: 'Suas notificações Push do AgendaSpace estão configuradas e funcionando perfeitamente!',
      url: '/settings',
      idempotencyKey: `test-push-${userId}-${Date.now()}`,
    });

    return {
      success: true,
      message: 'Notificação de teste enfileirada para envio.',
      deviceCount: subscriptions.length,
    };
  }
}
