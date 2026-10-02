import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista todos os usuários cadastrados (sem expor passwordHash).
   * Usado pela tela de Admin > Usuários.
   */
  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Busca um único usuário pelo ID.
   */
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuário com ID "${id}" não encontrado.`);
    }

    return user;
  }

  /**
   * Atualiza os dados de um usuário (role, fullName, avatarUrl, email).
   * Usado pela tela de Admin para trocar roles e pela tela de Settings para editar perfil.
   */
  async update(id: string, dto: UpdateUserDto) {
    const user = await this.findOne(id);

    // Se o email está sendo alterado, verifica se já existe
    if (dto.email && dto.email !== user.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: dto.email }
      });
      if (emailExists) {
        throw new ConflictException('Este email já está em uso.');
      }
    }

    // Se está tentando remover a role de ADMIN, verifica se é o último
    if (dto.role === 'USER' && user.role === 'ADMIN') {
      const adminCount = await this.prisma.user.count({
        where: { role: 'ADMIN' }
      });
      if (adminCount <= 1) {
        throw new BadRequestException('Não é possível remover o último administrador do sistema.');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined && { fullName: dto.fullName }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.role !== undefined && { role: dto.role }),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
