import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class VerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !user.isVerified) {
      throw new ForbiddenException('Conta não verificada. Por favor, verifique seu email para acessar este recurso.');
    }
    return true;
  }
}
