import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { PayBookingDto } from './dto/pay-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  /**
   * Endpoint de criação de reserva.
   * Realiza a validação de conflito de datas e o cálculo do total_price automaticamente.
   */
  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() createBookingDto: CreateBookingDto,
  ) {
    return this.bookingsService.create(userId, createBookingDto);
  }

  /**
   * Retorna as reservas feitas pelo usuário autenticado como cliente.
   */
  @Get('my-bookings')
  async findMyBookings(@CurrentUser('id') userId: string) {
    return this.bookingsService.findByClient(userId);
  }

  /**
   * Retorna as reservas recebidas pelo anfitrião para os espaços que ele gerencia.
   */
  @Get('host')
  async findHostBookings(@CurrentUser('id') userId: string) {
    return this.bookingsService.findByHost(userId);
  }

  /**
   * Lista as reservas pertinentes ao usuário autenticado (ou todas para ADMIN).
   * Suporta filtro opcional ?type=client ou ?type=host.
   */
  @Get()
  async findAll(
    @CurrentUser() user: { id: string; role: string },
    @Query('type') type?: 'client' | 'host',
  ) {
    return this.bookingsService.findAll(user.id, user.role, type);
  }

  /**
   * Retorna as reservas/horários ocupados de um espaço para exibição de disponibilidade.
   */
  @Get('space/:spaceId')
  async findBySpace(
    @Param('spaceId') spaceId: string,
    @Query('date') date?: string,
  ) {
    return this.bookingsService.findBySpace(spaceId, date);
  }

  /**
   * Busca detalhes de uma reserva específica.
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.bookingsService.findOne(id, user.id, user.role);
  }

  /**
   * Atualiza o status da reserva (ex: CONFIRMED ou CANCELLED).
   */
  @Patch(':id')
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
    @Body() updateStatusDto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateStatus(
      id,
      user.id,
      user.role,
      updateStatusDto,
    );
  }

  /**
   * Endpoint acadêmico para simulação de pagamento e aceite de contrato.
   */
  @Post(':id/pay')
  async pay(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() payBookingDto: PayBookingDto,
  ) {
    return this.bookingsService.pay(id, userId, payBookingDto);
  }
}
