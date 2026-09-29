import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('profiles')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /profiles
   * Lista todos os usuários. Apenas ADMIN pode acessar.
   * Consumido pela tela Admin > Usuários.
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async findAll() {
    return this.usersService.findAll();
  }

  /**
   * GET /profiles/:id
   * Busca um único usuário pelo ID.
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  /**
   * PATCH /profiles/:id
   * Atualiza dados do usuário.
   * - ADMIN pode alterar qualquer campo (inclusive role) de qualquer usuário.
   * - Usuários comuns só podem alterar o próprio perfil (sem mudar role).
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() currentUser: { id: string; role: string },
    @Body() updateUserDto: UpdateUserDto,
  ) {
    // Se o usuário não é ADMIN, só pode editar o próprio perfil e não pode mudar o role
    if (currentUser.role !== Role.ADMIN) {
      if (currentUser.id !== id) {
        throw new ForbiddenException('Você não tem permissão para editar outro usuário.');
      }
      // Remove role do DTO para evitar escalação de privilégios
      delete updateUserDto.role;
    }

    return this.usersService.update(id, updateUserDto);
  }
}
