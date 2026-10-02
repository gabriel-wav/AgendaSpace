import { IsEnum, IsOptional } from 'class-validator';

export enum BookingStatusEnum {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ApprovalStatusEnum {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class UpdateBookingStatusDto {
  @IsOptional()
  @IsEnum(BookingStatusEnum, { message: 'Status de reserva inválido' })
  status?: BookingStatusEnum;

  @IsOptional()
  @IsEnum(ApprovalStatusEnum, { message: 'Status de aprovação inválido' })
  approvalStatus?: ApprovalStatusEnum;
}
