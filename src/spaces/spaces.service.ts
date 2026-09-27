import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';

@Injectable()
export class SpacesService {
  /**
   * Injeção de dependência do PrismaService.
   * O PrismaService herda de PrismaClient e gerencia o pool de conexões
   * e as queries com o banco de dados MySQL de forma tipada.
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria um novo espaço associando-o ao usuário criador autenticado (created_by)
   */
  async create(userId: string, dto: CreateSpaceDto) {
    return this.prisma.space.create({
      data: {
        name: dto.name,
        description: dto.description,
        capacity: dto.capacity,
        pricePerHour: dto.pricePerHour,
        resources: dto.resources ?? [],
        imageUrl: dto.imageUrl,
        isActive: dto.isActive ?? true,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Lista todos os espaços disponíveis (filtrando por ativos por padrão)
   */
  async findAll(activeOnly = true) {
    return this.prisma.space.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Busca um espaço específico pelo ID (UUID)
   */
  async findOne(id: string) {
    const space = await this.prisma.space.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!space) {
      throw new NotFoundException(`Espaço com o ID "${id}" não foi encontrado.`);
    }

    return space;
  }

  /**
   * Atualiza os dados de um espaço.
   * Apenas o criador original ou um usuário com papel ADMIN podem alterar.
   */
  async update(id: string, userId: string, role: string, dto: UpdateSpaceDto) {
    const space = await this.findOne(id);

    if (space.createdById !== userId && role !== 'ADMIN') {
      throw new ForbiddenException('Você não tem permissão para editar este espaço.');
    }

    return this.prisma.space.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        capacity: dto.capacity,
        pricePerHour: dto.pricePerHour,
        resources: dto.resources !== undefined ? dto.resources : undefined,
        imageUrl: dto.imageUrl,
        isActive: dto.isActive,
      },
    });
  }

  /**
   * Remove ou desativa um espaço (soft delete).
   * Apenas o criador ou ADMIN podem realizar a operação.
   */
  async remove(id: string, userId: string, role: string) {
    const space = await this.findOne(id);

    if (space.createdById !== userId && role !== 'ADMIN') {
      throw new ForbiddenException('Você não tem permissão para remover este espaço.');
    }

    // Soft delete para manter o histórico de reservas íntegro
    return this.prisma.space.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
