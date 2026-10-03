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
    const imagesArray = dto.images || [];
    const derivedImageUrl = imagesArray.length > 0 ? imagesArray[0] : dto.imageUrl;

    return this.prisma.space.create({
      data: {
        name: dto.name,
        description: dto.description,
        capacity: dto.capacity,
        pricePerHour: dto.pricePerHour,
        resources: dto.resources ?? [],
        imageUrl: derivedImageUrl,
        isActive: dto.isActive ?? true,
        createdById: userId,
        images: imagesArray.length > 0 ? {
          create: imagesArray.map((url, position) => ({ url, position })),
        } : undefined,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        images: {
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  /**
   * Lista todos os espaços disponíveis (filtrando por ativos por padrão)
   */
  async findAll(activeOnly = true, q?: string, includeDeleted = false) {
    const where: any = {};
    if (activeOnly) {
      where.isActive = true;
    }
    if (!includeDeleted) {
      where.isDeleted = false;
    }
    if (q) {
      where.name = { contains: q };
    }

    return this.prisma.space.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        images: {
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Lista todos os espaços pertencentes a um anfitrião específico (ativos e inativos).
   */
  async findByOwner(userId: string) {
    return this.prisma.space.findMany({
      where: { createdById: userId },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        images: {
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Busca um espaço específico pelo ID (UUID)
   */
  async findOne(id: string, user?: { id: string; role: string }) {
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
        images: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!space) {
      throw new NotFoundException(`Espaço com o ID "${id}" não foi encontrado.`);
    }

    if (space.isDeleted) {
      let canView = false;
      if (user) {
        if (user.role === 'ADMIN' || user.id === space.createdById) {
          canView = true;
        } else {
          const hasBooking = await this.prisma.booking.findFirst({
            where: { spaceId: id, userId: user.id },
          });
          if (hasBooking) canView = true;
        }
      }
      if (!canView) {
        throw new ForbiddenException('Este espaço foi excluído e não está mais disponível publicamente.');
      }
    }

    return space;
  }

  /**
   * Atualiza os dados de um espaço.
   * Apenas o criador original ou um usuário com papel ADMIN podem alterar.
   */
  async update(id: string, userId: string, role: string, dto: UpdateSpaceDto) {
    return this.prisma.$transaction(async (tx) => {
      const spaces = await tx.$queryRaw<any[]>`SELECT * FROM spaces WHERE id = ${id} FOR UPDATE`;
      if (!spaces || spaces.length === 0) {
        throw new NotFoundException(`Espaço com o ID "${id}" não foi encontrado.`);
      }

      const space = spaces[0];

      if (space.is_deleted || space.deleted_at !== null) {
        throw new ForbiddenException('Não é possível editar ou reativar um espaço excluído.');
      }

      if (space.created_by !== userId && role !== 'ADMIN') {
        throw new ForbiddenException('Você não tem permissão para editar este espaço.');
      }

      // Sync gallery
      if (dto.images !== undefined) {
        await tx.spaceImage.deleteMany({ where: { spaceId: id } });
        if (dto.images.length > 0) {
          await tx.spaceImage.createMany({
            data: dto.images.map((url, position) => ({ spaceId: id, url, position })),
          });
        }
      }

      const derivedImageUrl = dto.images !== undefined
        ? (dto.images.length > 0 ? dto.images[0] : null)
        : (dto.imageUrl !== undefined ? dto.imageUrl : space.image_url);

      return tx.space.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          capacity: dto.capacity,
          pricePerHour: dto.pricePerHour,
          resources: dto.resources !== undefined ? dto.resources : undefined,
          imageUrl: derivedImageUrl,
          isActive: dto.isActive,
        },
        include: {
          images: {
            orderBy: { position: 'asc' },
          },
        },
      });
    });
  }

  /**
   * Remove ou desativa um espaço (soft delete).
   * Apenas o criador ou ADMIN podem realizar a operação.
   */
  async remove(id: string, userId: string, role: string) {
    return this.prisma.$transaction(async (tx) => {
      const spaces = await tx.$queryRaw<any[]>`SELECT * FROM spaces WHERE id = ${id} FOR UPDATE`;
      if (!spaces || spaces.length === 0) {
        throw new NotFoundException(`Espaço com o ID "${id}" não foi encontrado.`);
      }

      const space = spaces[0];

      if (space.created_by !== userId && role !== 'ADMIN') {
        throw new ForbiddenException('Você não tem permissão para remover este espaço.');
      }

      if (space.is_deleted || space.deleted_at !== null) {
        // Idempotente se já excluído
        return tx.space.findUnique({ where: { id } });
      }

      // Soft delete permanente e independente de isActive
      return tx.space.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date(), isActive: false },
      });
    });
  }
}
