import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class VerifyEmailDto {
  @IsEmail({}, { message: 'Formato de e-mail inválido.' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  token: string;
}

export class ResendVerificationDto {
  @IsEmail({}, { message: 'Formato de e-mail inválido.' })
  @IsNotEmpty()
  email: string;
}

export class ChangeEmailDto {
  @IsEmail({}, { message: 'Formato de e-mail inválido.' })
  @IsNotEmpty()
  newEmail: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres.' })
  password: string;
}

export class ConfirmChangeEmailAuthDto {
  @IsString()
  @IsNotEmpty()
  challengeId: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}
