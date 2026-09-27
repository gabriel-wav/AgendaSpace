import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Obtém as roles configuradas no manipulador da rota (@Roles) ou na classe do Controller
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Se nenhuma role foi especificada pelo decorator @Roles, o acesso é liberado
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Obtém o usuário que foi injetado na requisição pelo JwtAuthGuard
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException(
        'Acesso negado: dados de permissão do usuário não foram encontrados na sessão.',
      );
    }

    // Verifica se a role do usuário logado está entre as roles exigidas para o endpoint
    const hasRole = requiredRoles.some((role) => role === user.role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Acesso negado: seu perfil (${user.role}) não possui privilégios para acessar este recurso. Perfis necessários: [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}
