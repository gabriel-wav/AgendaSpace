import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
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
   * Lista as reservas pertinentes ao usuário autenticado (ou todas para ADMIN).
   */
  @Get()
  async findAll(@CurrentUser() user: { id: string; role: string }) {
    return this.bookingsService.findAll(user.id, user.role);
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
  @Patch(':id/status')
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
}
