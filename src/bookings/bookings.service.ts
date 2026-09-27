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

    if (start.getTime() < Date.now()) {
      throw new BadRequestException('Não é permitido agendar reservas no passado.');
    }

    // 1. Valida se o espaço existe e está ativo no MySQL
    const space = await this.prisma.space.findUnique({
      where: { id: dto.spaceId },
    });

    if (!space) {
      throw new NotFoundException(`Espaço com ID "${dto.spaceId}" não encontrado.`);
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
    const durationInMs = end.getTime() - start.getTime();
    const durationInHours = durationInMs / (1000 * 60 * 60);

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
   * Lista as reservas do usuário logado (ou todas se for administrador)
   */
  async findAll(userId: string, role: string) {
    return this.prisma.booking.findMany({
      where: role === 'ADMIN' ? undefined : { userId },
      include: {
        space: {
          select: {
            id: true,
            name: true,
            pricePerHour: true,
          },
        },
      },
      orderBy: { startDatetime: 'asc' },
    });
  }

  /**
   * Consulta os detalhes de uma reserva específica
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
      },
    });

    if (!booking) {
      throw new NotFoundException(`Reserva com ID "${id}" não encontrada.`);
    }

    // Apenas o dono da reserva ou ADMIN pode visualizar
    if (booking.userId !== userId && role !== 'ADMIN') {
      throw new ForbiddenException('Acesso não autorizado a esta reserva.');
    }

    return booking;
  }

  /**
   * Atualização de status da reserva (ex: CONFIRMED, CANCELLED)
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

    // Validação de permissões: dono do espaço ou admin podem confirmar/cancelar; cliente pode cancelar a sua
    const isOwnerOfSpace = booking.space.createdById === userId;
    const isClient = booking.userId === userId;
    const isAdmin = role === 'ADMIN';

    if (!isOwnerOfSpace && !isAdmin && (!isClient || dto.status !== BookingStatusEnum.CANCELLED)) {
      throw new ForbiddenException('Você não tem permissão para alterar este status.');
    }

    // Se o status estiver sendo alterado para CONFIRMED, checar se não houve choque concorrente
    if (dto.status === BookingStatusEnum.CONFIRMED) {
      const conflict = await this.prisma.booking.findFirst({
        where: {
          id: { not: booking.id },
          spaceId: booking.spaceId,
          status: {
            in: [BookingStatusEnum.CONFIRMED, BookingStatusEnum.COMPLETED],
          },
          AND: [
            { startDatetime: { lt: booking.endDatetime } },
            { endDatetime: { gt: booking.startDatetime } },
          ],
        },
      });

      if (conflict) {
        throw new ConflictException(
          'Não é possível confirmar a reserva pois já existe outra reserva conflitante para este horário.',
        );
      }
    }

    return this.prisma.booking.update({
      where: { id },
      data: { status: dto.status },
    });
  }
}
