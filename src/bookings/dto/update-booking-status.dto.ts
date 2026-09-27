import { IsEnum, IsNotEmpty } from 'class-validator';

export enum BookingStatusEnum {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class UpdateBookingStatusDto {
  @IsEnum(BookingStatusEnum, { message: 'Status de reserva inválido' })
  @IsNotEmpty({ message: 'O status é obrigatório' })
  status: BookingStatusEnum;
}
