import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookingsExpirationService {
  private readonly logger = new Logger(BookingsExpirationService.name);
  private isRunning = false;

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async handleCron() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      await this.expireUnpaidBookings();
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
          await tx.booking.update({
            where: { id: candidate.id },
            data: {
              status: 'CANCELLED',
              cancelledAt: new Date(),
              cancellationReason: 'UNPAID_AT_START',
            },
          });

          this.logger.log(`Reserva ${candidate.id} expirada (motivo: UNPAID_AT_START).`);
        });
      } catch (err) {
        this.logger.error(`Falha ao expirar reserva ${candidate.id}:`, err);
      }
    }
  }
}
