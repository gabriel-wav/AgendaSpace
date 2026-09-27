import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseBoolPipe,
} from '@nestjs/common';
import { SpacesService } from './spaces.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('spaces')
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  /**
   * Endpoint de criação de espaços.
   * Protegido por JwtAuthGuard - requer token Bearer JWT.
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() createSpaceDto: CreateSpaceDto,
  ) {
    return this.spacesService.create(userId, createSpaceDto);
  }

  /**
   * Listagem pública de espaços disponíveis.
   */
  @Get()
  async findAll(@Query('activeOnly') activeOnly?: string) {
    const isFiltered = activeOnly !== undefined ? activeOnly === 'true' : true;
    return this.spacesService.findAll(isFiltered);
  }

  /**
   * Detalhes de um espaço específico.
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.spacesService.findOne(id);
  }

  /**
   * Atualização de um espaço.
   * Rota protegida por autenticação.
   */
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
    @Body() updateSpaceDto: UpdateSpaceDto,
  ) {
    return this.spacesService.update(id, user.id, user.role, updateSpaceDto);
  }

  /**
   * Desativação de um espaço.
   * Rota protegida por autenticação.
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.spacesService.remove(id, user.id, user.role);
  }
}
