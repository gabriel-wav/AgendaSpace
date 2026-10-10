import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
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
   * GET /profiles/me
   * Retorna os dados do próprio perfil.
   */
  @Get('me')
  async getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.findOne(userId);
  }

  @Get('me/preferences')
  async getPreferences(@CurrentUser('id') userId: string) {
    return this.usersService.getPreferences(userId);
  }

  @Patch('me/preferences')
  async updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.usersService.updatePreferences(userId, dto);
  }

  /**
   * PATCH /profiles/me
   * Atualiza dados do próprio usuário (perfil).
   */
  @Patch('me')
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.update(userId, updateProfileDto);
  }

  /**
   * GET /profiles/:id
   * Busca um único usuário pelo ID.
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: { id: string; role: string },
  ) {
    const user = await this.usersService.findOne(id);
    if (currentUser.role !== 'ADMIN' && currentUser.id !== id) {
      const pref = await this.usersService.getPreferences(id);
      const { phone, email, ...publicData } = user;
      if (pref.showPhone) {
        return { ...publicData, phone };
      }
      return publicData;
    }
    return user;
  }

  /**
   * PATCH /profiles/:id
   * Atualiza dados do usuário (ADMIN).
   */
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  /**
   * DELETE /profiles/:id
   * Baniu/soft-delete um usuário. Apenas ADMIN.
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.usersService.banUser(id, adminId);
  }

  /**
   * PATCH /profiles/:id/restore
   * Desbanir / reativar usuário. Apenas ADMIN.
   */
  @Patch(':id/restore')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async restore(
    @Param('id') id: string,
  ) {
    return this.usersService.unbanUser(id);
  }
}
