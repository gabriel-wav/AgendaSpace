import { IsOptional, IsString, IsEnum, IsBoolean, ValidateIf } from 'class-validator';
import { Role } from '../../auth/enums/role.enum';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsEnum(Role, { message: 'Role deve ser ADMIN ou USER.' })
  role?: Role;

  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @ValidateIf(o => o.phone !== undefined && o.phone !== '')
  @IsString()
  phone?: string;
}
