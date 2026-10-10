import { IsString, IsNotEmpty, MinLength, IsOptional, IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Informe um email válido.' })
  @IsNotEmpty({ message: 'O email é obrigatório.' })
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'O token é obrigatório.' })
  token!: string;

  @IsString()
  @IsNotEmpty({ message: 'A nova senha é obrigatória.' })
  @MinLength(6, { message: 'A nova senha deve ter no mínimo 6 caracteres.' })
  newPassword!: string;
}

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
