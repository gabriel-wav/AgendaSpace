import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
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
}
