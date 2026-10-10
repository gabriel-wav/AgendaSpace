import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { PushService } from '../notifications/push.service';

@Injectable()
export class BookingsExpirationService {
  private readonly logger = new Logger(BookingsExpirationService.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly pushService: PushService,
  ) {}

  private async createNotificationAndPush(
    tx: any,
    data: {
      userId: string;
      type: string;
      referenceId?: string | null;
      title: string;
      message: string;
      idempotencyKey: string;
      url?: string;
    },
  ) {
    const notif = await tx.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        referenceId: data.referenceId || null,
        title: data.title,
        message: data.message,
        idempotencyKey: data.idempotencyKey,
      },
    });

    await this.pushService.queuePush(tx, {
      userId: data.userId,
      notificationId: notif.id,
      referenceId: data.referenceId || null,
      type: data.type,
      title: data.title,
      body: data.message,
      url: data.url || (data.referenceId ? `/bookings/${data.referenceId}` : '/notifications'),
      idempotencyKey: `push-${data.idempotencyKey}`,
    });

    return notif;
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async handleCron() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      await this.expireUnpaidBookings();
      await this.processReminders();
    } catch (error) {
      this.logger.error('Erro ao expirar reservas não pagas', error);
    } finally {
      this.isRunning = false;
    }
  }

  async expireUnpaidBookings() {
    const now = new Date();

    // Busca reservas candidatas:
    // status = PENDING
    // startDatetime <= now
    const candidates = await this.prisma.booking.findMany({
      where: {
        status: 'PENDING',
        startDatetime: { lte: now },
      },
      select: {
        id: true,
        spaceId: true,
        startDatetime: true,
      },
    });

    if (candidates.length === 0) {
      return;
    }

    for (const candidate of candidates) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // 1. Manter a mesma ordem de bloqueios de `payBooking` e `updateBookingStatus`:
          // Primeiro bloqueia o espaço
          await tx.$queryRaw`SELECT id FROM spaces WHERE id = ${candidate.spaceId} FOR UPDATE`;

          // 2. Bloqueia e releia a reserva
          const bookings = await tx.$queryRaw<any[]>`SELECT status, start_datetime FROM bookings WHERE id = ${candidate.id} FOR UPDATE`;
          if (bookings.length === 0) return; // Não existe

          const booking = bookings[0];

          // 3. Verifica relógio e status atualizados dentro da zona protegida
          if (booking.status !== 'PENDING') {
            return; // Já processada
          }

          if (new Date(booking.start_datetime).getTime() > Date.now()) {
            return; // Ainda não expirou (relógio sincronizado)
          }

          // 4. Verifica pagamento associado
          const payment = await tx.payment.findUnique({
            where: { bookingId: candidate.id },
          });

          // Se existir um pagamento SUCCESS, preserva a reserva
          if (payment && payment.status === 'SUCCESS') {
            return;
          }

          // 5. Nenhuma condição evitou a expiração: cancela
          const updatedBooking = await tx.booking.update({
            where: { id: candidate.id },
            data: {
              status: 'CANCELLED',
              cancelledAt: new Date(),
              cancellationReason: 'UNPAID_AT_START',
            },
            include: { user: true, space: { include: { createdBy: true } } }
          });

          await this.createNotificationAndPush(tx, {
            userId: updatedBooking.user.id,
            type: 'BOOKING_CANCELLED',
            referenceId: updatedBooking.id,
            title: 'Reserva Expirada',
            message: `Sua reserva em ${updatedBooking.space.name} foi cancelada por falta de pagamento.`,
            idempotencyKey: `notif-client-expire-${updatedBooking.id}`,
          });
          await this.mailService.queueEmail(tx, {
            recipient: updatedBooking.user.email,
            templateName: 'BOOKING_CANCELLED',
            payload: {
              fullName: updatedBooking.user.fullName,
              spaceName: updatedBooking.space.name,
              date: updatedBooking.startDatetime.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
              reason: 'UNPAID_AT_START',
            },
            idempotencyKey: `email-client-expire-${updatedBooking.id}`,
          });

          if (updatedBooking.space.createdById && updatedBooking.space.createdById !== updatedBooking.user.id) {
            await this.createNotificationAndPush(tx, {
              userId: updatedBooking.space.createdById,
              type: 'BOOKING_CANCELLED_HOST',
              referenceId: updatedBooking.id,
              title: 'Reserva Expirada',
              message: `A reserva de ${updatedBooking.user.fullName} em ${updatedBooking.space.name} expirou sem pagamento.`,
              idempotencyKey: `notif-host-expire-${updatedBooking.id}`,
            });
            await this.mailService.queueEmail(tx, {
              recipient: updatedBooking.space.createdBy!.email,
              templateName: 'BOOKING_CANCELLED',
              payload: {
                fullName: updatedBooking.space.createdBy!.fullName,
                spaceName: updatedBooking.space.name,
                date: updatedBooking.startDatetime.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
                reason: 'UNPAID_AT_START',
              },
              idempotencyKey: `email-host-expire-${updatedBooking.id}`,
            });
          }

          this.logger.log(`Reserva ${candidate.id} expirada (motivo: UNPAID_AT_START).`);
        });
      } catch (err) {
        this.logger.error(`Falha ao expirar reserva ${candidate.id}:`, err);
      }
    }
  }

  async processReminders() {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    const candidates = await this.prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        startDatetime: { lte: oneHourFromNow, gt: now },
      },
      include: { user: true, space: { include: { createdBy: true } } }
    });

    if (candidates.length === 0) return;

    for (const booking of candidates) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // Check if already sent in this exact moment
          const existing = await tx.notification.findFirst({
            where: { referenceId: booking.id, type: 'BOOKING_REMINDER' }
          });
          if (existing) return;

          await this.createNotificationAndPush(tx, {
            userId: booking.user.id,
            type: 'BOOKING_REMINDER',
            referenceId: booking.id,
            title: 'Lembrete de Reserva',
            message: `Sua reserva em ${booking.space.name} começará em menos de 1 hora.`,
            idempotencyKey: `notif-client-reminder-${booking.id}`,
          });

          await this.mailService.queueEmail(tx, {
            recipient: booking.user.email,
            templateName: 'BOOKING_REMINDER',
            payload: {
              fullName: booking.user.fullName,
              spaceName: booking.space.name,
              date: booking.startDatetime.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
            },
            idempotencyKey: `email-client-reminder-${booking.id}`,
          });
          this.logger.log(`Lembrete enviado para reserva ${booking.id}.`);
        });
      } catch (err) {
        this.logger.error(`Falha ao enviar lembrete para reserva ${booking.id}:`, err);
      }
    }
  }
}
