import { IsString, IsNotEmpty, MinLength, IsOptional } from 'class-validator';

export class ChangePasswordInitDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'A nova senha deve ter no mínimo 6 caracteres.' })
  newPassword!: string;
}

export class ChangePasswordConfirmDto {
  @IsString()
  @IsNotEmpty()
  challengeId!: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  recoveryCode?: string;
}
