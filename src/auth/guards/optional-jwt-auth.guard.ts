import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err, user, info) {
    // Retorna o usuário se autenticado, caso contrário retorna null (sem lançar erro)
    return user || null;
  }
}
