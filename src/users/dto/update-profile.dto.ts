import { IsOptional, IsString, MaxLength, Matches, ValidateIf } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @ValidateIf(o => o.phone !== undefined && o.phone !== '')
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, { message: 'Formato de telefone inválido. Use o padrão internacional (ex: +5511999999999)' })
  @MaxLength(20)
  phone?: string;
}
