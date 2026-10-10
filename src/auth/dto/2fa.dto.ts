import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class Enable2FADto {
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class Disable2FADto {
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class RegenerateRecoveryDto {
  @IsString()
  @IsNotEmpty()
  password!: string;
}
