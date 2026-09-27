import {
  IsUUID,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateBookingDto {
  @IsUUID('all', { message: 'O ID do espaço deve ser um UUID válido' })
  @IsNotEmpty({ message: 'O ID do espaço é obrigatório' })
  spaceId: string;

  @IsISO8601({}, { message: 'A data/hora de início deve estar no formato ISO 8601 válido' })
  @IsNotEmpty({ message: 'A data/hora de início é obrigatória' })
  startDatetime: string;

  @IsISO8601({}, { message: 'A data/hora de término deve estar no formato ISO 8601 válido' })
  @IsNotEmpty({ message: 'A data/hora de término é obrigatória' })
  endDatetime: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
