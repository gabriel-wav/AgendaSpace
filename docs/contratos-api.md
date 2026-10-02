# Contratos de API (AgendaSpace)

Este documento define os tipos, endpoints e contratos de comunicação entre o Frontend (React/Vite) e o Backend (NestJS). Todas as rotas baseiam-se em respostas JSON e seguem o padrão camelCase, com exceção de mapeamentos físicos de banco de dados (usando `@map` no Prisma).

## Princípios Gerais

1. **Autenticação**: O token JWT deve ser passado no cabeçalho `Authorization: Bearer <token>`.
2. **Tipagem de Valores Monetários**: O tipo `Decimal` do MySQL Prisma é retornado como `string` para evitar perda de precisão flutuante. O Frontend formata-o em `BRL` antes da renderização.
3. **Erros**:
   - `400 Bad Request`: Erros de validação e regras de negócio violadas.
   - `401 Unauthorized`: Token ausente ou inválido. O cliente (axios interceptor) limpa os caches de sessão e força o logout.
   - `403 Forbidden`: Permissões insuficientes (ex: tentar alterar um espaço de outro anfitrião).
   - `404 Not Found`: Recurso não encontrado.
   - `409 Conflict`: Conflitos de estado (ex: agendamento sobreposto).
4. **Resolução Dinâmica de Autorização**: Não há mais papéis `TENANT`. Qualquer usuário autenticado (modelo "Airbnb") pode atuar como Anfitrião ou Cliente em diferentes fluxos.

## Tipos Base (Frontend)

```typescript
// src/lib/spaces.api.ts
export interface Space {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  pricePerHour: string; // Serializado como string decimal
  resources: string[];
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  createdBy?: {
    id: string;
    fullName: string;
    email: string;
  };
}

// src/lib/bookings.api.ts
export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface Booking {
  id: string;
  userId: string;
  spaceId: string;
  startDatetime: string;
  endDatetime: string;
  totalPrice: string; // Serializado como string decimal
  notes: string | null;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  space?: Space;
  user?: {
    id: string;
    fullName: string;
    email: string;
  };
}
```

## Endpoints

### 1. Spaces (Espaços)
| Método | Rota | Descrição | Status de Sucesso | Possíveis Erros |
|---|---|---|---|---|
| GET | `/spaces?activeOnly=true` | Lista espaços do catálogo | 200 OK | - |
| GET | `/spaces/mine` | Lista espaços do anfitrião autenticado | 200 OK | 401 |
| GET | `/spaces/:id` | Detalhes de um espaço | 200 OK | 404 |
| POST | `/spaces` | Cria um espaço para o usuário atual | 201 Created | 401, 400 |
| PATCH | `/spaces/:id` | Edita dados do espaço (só dono/admin) | 200 OK | 401, 403, 404 |
| DELETE| `/spaces/:id` | Soft delete do espaço (só dono/admin) | 200 OK | 401, 403, 404 |

### 2. Bookings (Reservas)
| Método | Rota | Descrição | Status de Sucesso | Possíveis Erros |
|---|---|---|---|---|
| POST | `/bookings` | Cria uma reserva para o espaço | 201 Created | 401, 400, 404, 409 |
| GET | `/bookings/my-bookings`| Lista reservas feitas pelo usuário | 200 OK | 401 |
| GET | `/bookings/host` | Lista reservas recebidas nos espaços do usuário | 200 OK | 401 |
| GET | `/bookings?type=client\|host` | Lista com filtro opcional | 200 OK | 401 |
| GET | `/bookings/space/:spaceId?date=YYYY-MM-DD` | Busca dias/horários ocupados | 200 OK | 404 |
| GET | `/bookings/:id` | Detalhes da reserva (só cliente, dono do espaço ou admin)| 200 OK | 401, 403, 404 |
| PATCH | `/bookings/:id` | Atualiza status da reserva (`status`) | 200 OK | 401, 403, 404, 409 |

### 3. Auth (Autenticação)
| Método | Rota | Descrição | Status de Sucesso | Possíveis Erros |
|---|---|---|---|---|
| POST | `/auth/register` | Cria novo usuário e retorna JWT | 201 Created | 400 |
| POST | `/auth/login` | Autentica usuário e retorna JWT | 200 OK | 401 |
| GET | `/auth/me` | Retorna dados da sessão baseados no JWT | 200 OK | 401 |

### 4. Feed & Interações
| Método | Rota | Descrição | Status de Sucesso | Possíveis Erros |
|---|---|---|---|---|
| GET | `/feed/spaces/:spaceId`| Posts de um espaço com likes/comentários | 200 OK | 404 |
| POST | `/feed/posts` | Publica nova foto/post no espaço | 201 Created | 401, 400 |
| POST | `/feed/posts/:postId/like` | Adiciona/Remove curtida (toggle) | 200 OK | 401, 404 |
| POST | `/feed/posts/:postId/comments` | Adiciona comentário a um post | 201 Created | 401, 400, 404 |
| DELETE| `/feed/posts/:postId`| Exclui post (autor/admin) | 200 OK | 401, 403, 404 |
| DELETE| `/feed/comments/:commentId` | Exclui comentário (autor/admin) | 200 OK | 401, 403, 404 |

### 5. Demais Endpoints (Users, Upload, Dashboard)
| Método | Rota | Descrição | Status de Sucesso | Possíveis Erros |
|---|---|---|---|---|
| GET | `/users/me` | Retorna o perfil completo do usuário logado | 200 OK | 401 |
| PATCH | `/users/me` | Edita o perfil completo do usuário logado | 200 OK | 401, 400 |
| POST | `/upload/image` | Faz upload de arquivo FormData | 201 Created | 401, 400 |
| GET | `/dashboard/stats` | Resumo de métricas (Admin) | 200 OK | 401, 403 |
| GET | `/dashboard/host` | Resumo de métricas (Anfitrião) | 200 OK | 401 |

