import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsNumber,
  IsArray,
  IsBoolean,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSpaceDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome do espaço é obrigatório' })
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @Type(() => Number)
  @IsInt({ message: 'A capacidade deve ser um número inteiro' })
  @Min(1, { message: 'A capacidade mínima é de 1 pessoa' })
  capacity: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O preço por hora deve ser um valor numérico válido' })
  @Min(0, { message: 'O preço por hora não pode ser negativo' })
  pricePerHour: number;

  @IsArray()
  @IsOptional()
  resources?: string[];

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
