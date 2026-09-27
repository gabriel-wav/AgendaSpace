import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsNumber,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSpaceDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  pricePerHour?: number;

  @IsArray()
  @IsOptional()
  resources?: string[];

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
