import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto, BookingStatusEnum } from './dto/update-booking-status.dto';
import { PayBookingDto } from './dto/pay-booking.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class BookingsService {
  /**
   * Injeção do PrismaService via construtor.
   * O Prisma fornece acesso tipado às tabelas Booking, Space e User no MySQL.
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Criação de reserva com validações completas:
   * 1. Existência e disponibilidade do espaço.
   * 2. Validação cronológica dos horários (início < fim).
   * 3. Verificação de conflito/choque de horários com reservas CONFIRMED ou COMPLETED.
   * 4. Cálculo automático do valor total baseado no preço/hora e duração.
   */
  async create(userId: string, dto: CreateBookingDto) {
    const start = new Date(dto.startDatetime);
    const end = new Date(dto.endDatetime);

    // Validação básica de coerência temporal
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Formato de data inválido.');
    }

    if (start >= end) {
      throw new BadRequestException(
        'A data/hora de início deve ser estritamente anterior à data/hora de término.',
      );
    }

    if (start.getTime() < Date.now() + 60 * 60 * 1000) {
      throw new BadRequestException('As reservas devem ser feitas com no mínimo 1 hora de antecedência.');
    }

    // Regras de horário (America/Sao_Paulo)
    // Extraindo horas e datas diretamente usando formatação de timezone
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });

    const formatToParts = (date: Date) => {
      const parts = formatter.formatToParts(date);
      const dict: any = {};
      parts.forEach(p => { dict[p.type] = p.value; });
      return dict;
    };

    const startParts = formatToParts(start);
    const endParts = formatToParts(end);

    if (startParts.year !== endParts.year || startParts.month !== endParts.month || startParts.day !== endParts.day) {
      throw new BadRequestException('A reserva deve iniciar e terminar no mesmo dia (horário local).');
    }

    const startHour = parseInt(startParts.hour, 10);
    const endHour = parseInt(endParts.hour, 10);
    const startMin = parseInt(startParts.minute, 10);
    const endMin = parseInt(endParts.minute, 10);
    const startSec = parseInt(startParts.second, 10);
    const endSec = parseInt(endParts.second, 10);

    if (startMin !== 0 || startSec !== 0 || endMin !== 0 || endSec !== 0 || start.getMilliseconds() !== 0 || end.getMilliseconds() !== 0) {
      throw new BadRequestException('As reservas devem ser feitas em horários exatos (hora cheia).');
    }

    if (startHour < 8 || endHour > 22 || (endHour === 22 && endMin > 0)) {
      throw new BadRequestException('O horário de funcionamento é das 08:00 às 22:00.');
    }

    const durationInMs = end.getTime() - start.getTime();
    const durationInHours = durationInMs / (1000 * 60 * 60);

    if (durationInHours > 8) {
      throw new BadRequestException('A duração máxima permitida por reserva é de 8 horas.');
    }

    // 1. Valida se o espaço existe e está ativo no MySQL
    const space = await this.prisma.space.findUnique({
      where: { id: dto.spaceId },
    });

    if (!space) {
      throw new NotFoundException(`Espaço com ID "${dto.spaceId}" não encontrado.`);
    }

    if (space.isDeleted || space.deletedAt !== null) {
      throw new BadRequestException('Este espaço foi excluído e não está mais disponível.');
    }

    if (!space.isActive) {
      throw new BadRequestException('Este espaço está desativado para novas reservas.');
    }

    // 2. Verificação de choque de horários:
    // Dois intervalos se sobrepõem se e somente se:
    // (start < reservaExistente.endDatetime) E (end > reservaExistente.startDatetime)
    const conflictingBooking = await this.prisma.booking.findFirst({
      where: {
        spaceId: dto.spaceId,
        status: {
          in: [BookingStatusEnum.CONFIRMED, BookingStatusEnum.COMPLETED],
        },
        AND: [
          { startDatetime: { lt: end } },
          { endDatetime: { gt: start } },
        ],
      },
    });

    if (conflictingBooking) {
      throw new ConflictException(
        'Existe um choque de horários: o espaço já possui uma reserva confirmada ou concluída neste período.',
      );
    }

    // 3. Cálculo automático do total_price

    // Preço por hora gravado no MySQL convertido para Number para operações aritméticas
    const hourlyRate = Number(space.pricePerHour);
    const totalPrice = Math.round(durationInHours * hourlyRate * 100) / 100;

    // 4. Criação do registro no banco com status inicial PENDING
    return this.prisma.booking.create({
      data: {
        userId,
        spaceId: dto.spaceId,
        startDatetime: start,
        endDatetime: end,
        totalPrice,
        notes: dto.notes,
        status: BookingStatusEnum.PENDING,
      },
      include: {
        space: {
          select: {
            id: true,
            name: true,
            pricePerHour: true,
            imageUrl: true,
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Retorna as reservas feitas pelo usuário autenticado como cliente.
   */
  async findByClient(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: {
        space: true,
        user: {
          select: { id: true, fullName: true, email: true },
        },
        payment: true,
        contract: true,
      },
      orderBy: { startDatetime: 'asc' },
    });
  }

  /**
   * Retorna as reservas recebidas pelo anfitrião para os espaços que ele gerencia.
   */
  async findByHost(userId: string) {
    return this.prisma.booking.findMany({
      where: {
        space: { createdById: userId },
      },
      include: {
        space: true,
        user: {
          select: { id: true, fullName: true, email: true },
        },
        payment: true,
        contract: true,
      },
      orderBy: { startDatetime: 'asc' },
    });
  }

  /**
   * Lista as reservas pertinentes ao usuário logado (ou todas se for administrador).
   * Suporta separação estrita por papel: 'client' ou 'host'.
   */
  async findAll(userId: string, role: string, type?: 'client' | 'host') {
    if (type === 'client') {
      return this.findByClient(userId);
    }
    if (type === 'host') {
      return this.findByHost(userId);
    }
    if (role === 'ADMIN') {
      return this.prisma.booking.findMany({
        include: {
          space: true,
          user: {
            select: { id: true, fullName: true, email: true },
          },
          payment: true,
          contract: true,
        },
        orderBy: { startDatetime: 'asc' },
      });
    }
    // Default para usuário comum: reservas feitas como cliente
    return this.findByClient(userId);
  }

  /**
   * Consulta os horários já reservados de um espaço para exibição de conflitos.
   */
  async findBySpace(spaceId: string, dateStr?: string) {
    const whereClause: any = {
      spaceId,
      status: {
        in: [BookingStatusEnum.CONFIRMED, BookingStatusEnum.COMPLETED],
      },
    };

    if (dateStr) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);

        const startOfDay = new Date(year, month, day, 0, 0, 0, 0);
        const endOfDay = new Date(year, month, day, 23, 59, 59, 999);

        whereClause.startDatetime = {
          gte: startOfDay,
          lte: endOfDay,
        };
      }
    }

    return this.prisma.booking.findMany({
      where: whereClause,
      select: {
        id: true,
        startDatetime: true,
        endDatetime: true,
        status: true,
      },
      orderBy: { startDatetime: 'asc' },
    });
  }

  /**
   * Consulta os detalhes de uma reserva específica.
   * Autorização: Cliente dono da reserva, Anfitrião dono do espaço ou Administrador.
   */
  async findOne(id: string, userId: string, role: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        space: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        payment: true,
        contract: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Reserva com ID "${id}" não encontrada.`);
    }

    const isOwnerOfSpace = booking.space?.createdById === userId;
    const isClient = booking.userId === userId;
    const isAdmin = role === 'ADMIN';

    if (!isOwnerOfSpace && !isClient && !isAdmin) {
      throw new ForbiddenException('Acesso não autorizado a esta reserva.');
    }

    return booking;
  }

  /**
   * Atualização de status da reserva (ex: CONFIRMED, CANCELLED).
   * Autorização:
   * - Dono do espaço (anfitrião) e ADMIN: podem confirmar, concluir ou cancelar.
   * - Cliente: pode cancelar ou confirmar (via simulação de pagamento).
   */
  async updateStatus(
    id: string,
    userId: string,
    role: string,
    dto: UpdateBookingStatusDto,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { space: true },
    });

    if (!booking) {
      throw new NotFoundException(`Reserva com ID "${id}" não encontrada.`);
    }

    const isOwnerOfSpace = booking.space?.createdById === userId;
    const isClient = booking.userId === userId;
    const isAdmin = role === 'ADMIN';

    if (!isOwnerOfSpace && !isAdmin && !isClient) {
      throw new ForbiddenException('Você não tem permissão para alterar esta reserva.');
    }

    if (dto.approvalStatus) {
      if (!isOwnerOfSpace && !isAdmin) {
        throw new ForbiddenException('Apenas o proprietário ou ADMIN podem aprovar/recusar reservas.');
      }

      if (booking.approvalStatus === dto.approvalStatus) {
        return booking;
      }

      if (dto.approvalStatus === 'REJECTED') {
        // Se houver pagamento simulado, podemos registrar reversão no futuro
        return this.prisma.booking.update({
          where: { id },
          data: {
            approvalStatus: 'REJECTED',
            approvedAt: new Date(),
            approvedById: userId,
            status: 'CANCELLED',
          },
        });
      }

      if (dto.approvalStatus === 'APPROVED') {
        if (booking.startDatetime.getTime() < Date.now()) {
          throw new BadRequestException('Não é possível aprovar uma reserva após o início do período.');
        }

        return this.prisma.$transaction(
          async (tx) => {
            const spaces = await tx.$queryRaw<any[]>`SELECT is_deleted, deleted_at FROM spaces WHERE id = ${booking.spaceId} FOR UPDATE`;

            if (spaces[0].is_deleted || spaces[0].deleted_at !== null) {
              throw new ConflictException('Não é possível aprovar a reserva pois o espaço foi excluído.');
            }

            const hasPayment = await tx.payment.findUnique({ where: { bookingId: id } });

            if (hasPayment) {
              const conflict = await tx.booking.findFirst({
                where: {
                  id: { not: booking.id },
                  spaceId: booking.spaceId,
                  status: {
                    in: ['CONFIRMED', 'COMPLETED'],
                  },
                  AND: [
                    { startDatetime: { lt: booking.endDatetime } },
                    { endDatetime: { gt: booking.startDatetime } },
                  ],
                },
              });

              if (conflict) {
                throw new ConflictException('Não é possível confirmar a reserva pois já existe outra reserva conflitante para este horário.');
              }

              return tx.booking.update({
                where: { id },
                data: {
                  status: 'CONFIRMED',
                  approvalStatus: 'APPROVED',
                  approvedAt: new Date(),
                  approvedById: userId,
                },
              });
            }

            return tx.booking.update({
              where: { id },
              data: {
                approvalStatus: 'APPROVED',
                approvedAt: new Date(),
                approvedById: userId,
              },
            });
          }
        );
      }
    }

    if (dto.status) {
      if (booking.status === dto.status) {
        return booking;
      }

      const currentStatus = booking.status;
      const targetStatus = dto.status;

      const allowedTransitions: Record<string, string[]> = {
        PENDING: ['CONFIRMED', 'CANCELLED'],
        CONFIRMED: ['COMPLETED', 'CANCELLED'],
        COMPLETED: [],
        CANCELLED: [],
      };

      if (!allowedTransitions[currentStatus].includes(targetStatus)) {
        throw new BadRequestException(`Transição de status inválida de ${currentStatus} para ${targetStatus}.`);
      }

      if (isClient && !isOwnerOfSpace && !isAdmin) {
        if (targetStatus === 'CANCELLED') {
          if (booking.startDatetime.getTime() - Date.now() < 2 * 60 * 60 * 1000) {
            throw new BadRequestException('Cancelamentos devem ser feitos com no mínimo 2 horas de antecedência.');
          }
        } else {
          throw new ForbiddenException('Clientes só podem cancelar via atualização de status. Use a rota de pagamento para confirmar.');
        }
      }

      if (targetStatus === 'CONFIRMED') {
        throw new BadRequestException('Não utilize atualização direta de status para confirmar. Use a rota de pagamento ou aprove a reserva.');
      }

      if (targetStatus === 'COMPLETED' && booking.endDatetime.getTime() > Date.now()) {
        throw new BadRequestException('Não é possível concluir uma reserva antes do término do seu horário programado.');
      }

      return this.prisma.booking.update({
        where: { id },
        data: { status: targetStatus as any },
      });
    }

    return booking;
  }

  /**
   * Lida com a simulação de pagamento acadêmico, aceite de contrato e confirmação da reserva.
   */
  async pay(id: string, userId: string, dto: PayBookingDto) {
    // Buscar reserva original com payment para verificar idempotência antes
    const booking = await this.prisma.booking.findUnique({
      where: { id, userId },
      include: { space: true, payment: true },
    });

    if (!booking) {
      throw new NotFoundException(`Reserva com ID "${id}" não encontrada ou não pertence a você.`);
    }

    // Verificação de idempotência e retries independentes de status PENDING
    if (booking.payment && booking.payment.idempotencyKey === dto.idempotencyKey) {
      return booking;
    }
    
    if (booking.payment) {
       throw new BadRequestException('Esta reserva já possui um pagamento registrado.');
    }

    if (booking.status !== 'PENDING') {
      throw new BadRequestException('Apenas reservas pendentes podem ser pagas.');
    }

    if (booking.startDatetime.getTime() < Date.now()) {
      throw new BadRequestException('Não é possível pagar uma reserva após o início do período.');
    }

    // Usar transação atômica
    return this.prisma.$transaction(
      async (tx) => {
        // Bloqueia a linha do espaço e checa exclusão
        const spaces = await tx.$queryRaw<any[]>`SELECT is_deleted, deleted_at FROM spaces WHERE id = ${booking.spaceId} FOR UPDATE`;

        if (spaces[0].is_deleted || spaces[0].deleted_at !== null) {
          throw new ConflictException('Não é possível confirmar a reserva pois o espaço foi excluído.');
        }

        // Idempotência extra dentro da transação para concorrência
        const existingPayment = await tx.payment.findUnique({
          where: { idempotencyKey: dto.idempotencyKey },
        });

        if (existingPayment) {
          if (existingPayment.bookingId !== booking.id) {
            throw new BadRequestException('Chave de idempotência reutilizada de forma inválida.');
          }
          return tx.booking.findUnique({ where: { id: booking.id } });
        }

        // Verifica conflitos
        const conflict = await tx.booking.findFirst({
          where: {
            id: { not: booking.id },
            spaceId: booking.spaceId,
            status: {
              in: ['CONFIRMED', 'COMPLETED'],
            },
            AND: [
              { startDatetime: { lt: booking.endDatetime } },
              { endDatetime: { gt: booking.startDatetime } },
            ],
          },
        });

        if (conflict) {
          throw new ConflictException('Não é possível confirmar a reserva pois o horário já foi ocupado por outra pessoa.');
        }

        // Registrar o contrato
        await tx.contractAcceptance.create({
          data: {
            bookingId: booking.id,
            version: dto.contractVersion,
            acceptedText: dto.contractAcceptedText,
          },
        });

        // Registrar o pagamento fictício
        await tx.payment.create({
          data: {
            bookingId: booking.id,
            method: dto.method === 'PIX' ? 'PIX' : 'CREDIT_CARD',
            status: 'SUCCESS',
            amount: booking.totalPrice,
            simulationRef: `SIM-${Date.now()}`,
            idempotencyKey: dto.idempotencyKey,
          },
        });

        if (booking.approvalStatus === 'APPROVED') {
          // Atualizar reserva para CONFIRMED
          return tx.booking.update({
            where: { id: booking.id },
            data: { status: 'CONFIRMED' },
          });
        }

        return tx.booking.findUnique({ where: { id: booking.id } });
      }
    );
  }
}
