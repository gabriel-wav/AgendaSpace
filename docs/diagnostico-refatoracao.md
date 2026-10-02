# 📋 Diagnóstico da Refatoração — AgendaSpace (Etapa 0)

> **Data da Auditoria:** 30 de setembro de 2026  
> **Responsável:** Engenheiro de Software / Arquiteto de Recuperação do AgendaSpace  
> **Status:** Concluído com sucesso (sem alterações no banco de dados e sem mutação indevida de arquivos)

---

## 1. Resumo Executivo e Contexto

O projeto **AgendaSpace** passou por uma migração arquitetural ampla, saindo de uma Single Page Application baseada diretamente no BaaS Supabase (PostgreSQL + Auth + Storage) para uma arquitetura full-stack moderna composta por:
- **Backend:** NestJS 12 com TypeScript.
- **Banco Relacional:** MySQL com Prisma 7 para Usuários, Espaços e Reservas.
- **Banco Documental NoSQL:** MongoDB com Mongoose para o Feed Social (Posts, Curtidas e Comentários).
- **Frontend:** React 18 + Vite + Tailwind CSS + Radix UI / shadcn/ui.
- **Modelo de Negócio:** Modelo Airbnb (Conta única: qualquer usuário autenticado pode atuar tanto como cliente quanto como anfitrião; apenas as roles `USER` e `ADMIN` existem).

Esta auditoria (Etapa 0) avalia minuciosamente o código local, confrontando-o com o histórico pré-migração (`0c94127205e6c0f13d9e50ddc98a705f7ceaf314`), com o branch remoto publicado (`origin/main`) e com os problemas relatados publicamente, estabelecendo uma base de fatos comprovada antes da aplicação das correções funcionais.

---

## 2. Comparativo de Estados do Repositório

```mermaid
graph TD
    A["Pré-migração: 0c94127205e6c0f13d9e50ddc98a705f7ceaf314<br/>(Supabase SPA Monolítica)"] --> B["origin/main Publicado<br/>(Incompleto: faltavam users/, upload/, bookings.api.ts)"]
    B --> C["Local Commit d3984e1<br/>(Restaurados módulos e arquivos ausentes)"]
    C --> D["Local Working Tree (Atual)<br/>(33 arquivos modificados: modelo Airbnb, calendário, DTOs)"]
```

### 2.1. Estado Pré-Migração (`0c94127205e6c0f13d9e50ddc98a705f7ceaf314`)
- **Arquitetura:** Aplicação puramente frontend (Vite/React) sem servidor de backend próprio.
- **Banco e Auth:** Todo o acesso era mediado pelo SDK `@supabase/supabase-js`, com consultas diretas às tabelas PostgreSQL (`profiles`, `spaces`, `bookings`, `contracts`).
- **Autenticação:** Sessão mantida pelo Supabase Gotrue (`supabase.auth.getUser()`, `supabase.auth.signInWithPassword()`).
- **Uploads:** Supabase Storage bucket `spaces` e `avatars`.
- **Feed Social:** Inexistente nesta fase (adicionado posteriormente para atender aos requisitos de banco documental NoSQL).

### 2.2. Estado Publicado Remoto (`origin/main`)
- O branch `origin/main` publicado continha falhas impeditivas graves que quebravam a compilação e a execução do full-stack:
  1. A pasta [src/users](file:///c:/Users/User/Documents/AgendaSpace/src/users) estava ausente, impedindo a injeção do `UsersModule` no `AppModule` e gerando erro de módulo não encontrado.
  2. A pasta [src/upload](file:///c:/Users/User/Documents/AgendaSpace/src/upload) estava ausente, gerando quebra de importação do `UploadModule`.
  3. O cliente [src/lib/bookings.api.ts](file:///c:/Users/User/Documents/AgendaSpace/src/lib/bookings.api.ts) não existia no versionamento do frontend, quebrando componentes que tentavam consumir a API de reservas.

### 2.3. Estado Local Atual (Working Directory)
- **Commit Local:** `d3984e1` (*"chore: restore untracked files"*) recuperou todos os 8 arquivos ausentes no repositório remoto.
- **Alterações Locais Preservadas:** 33 arquivos modificados e 2 scripts utilitários não rastreados (`fix-roles.cjs`, `fix-roles.js`).
- **Arquivos Versionados:** Todos os módulos necessários do backend e bibliotecas do frontend agora estão devidamente presentes no workspace local.
- **Compilação Preservada:** Código local compila limpo sem erros TypeScript tanto para o backend quanto para o frontend.

---

## 3. Transição para Conta Única (Modelo Airbnb)

A regra de negócio anterior diferenciava rigidamente "Locatários" (`TENANT`) e "Usuários" (`USER`). A nova diretriz estabelece o **Modelo Airbnb**: conta unificada onde qualquer `USER` pode reservar espaços e anunciar/gerenciar seus próprios espaços.

### 3.1. Estado no Schema do Prisma (`prisma/schema.prisma`)
- O enum `Role` foi alterado localmente para conter apenas `ADMIN` e `USER`:
  ```prisma
  enum Role {
    ADMIN
    USER
  }
  ```
- O valor padrão da coluna `role` em `User` foi definido como `@default(USER)`.
- O modelo `Space` referencia o criador pelo campo `createdById`:
  ```prisma
  createdById  String?   @map("created_by")
  createdBy    User?     @relation(fields: [createdById], references: [id], onDelete: SetNull)
  ```
- **Atenção:** No diretório `prisma/migrations`, existe atualmente apenas a migration inicial `20260924003240_init`, cujo DDL original criava o enum SQL com `('ADMIN', 'TENANT', 'USER')`. A remoção formal de `TENANT` no banco de dados ainda requer uma nova migration (`npx prisma migrate dev`), a ser executada em etapa posterior.

### 3.2. Dados no Banco MySQL
- Foi executado localmente o script [fix-roles.cjs](file:///c:/Users/User/Documents/AgendaSpace/fix-roles.cjs) que atualizou os registros da tabela `users`, convertendo quaisquer usuários que possuíam `role = 'TENANT'` para `role = 'USER'`.

### 3.3. Backend NestJS
- [src/auth/enums/role.enum.ts](file:///c:/Users/User/Documents/AgendaSpace/src/auth/enums/role.enum.ts): Contém apenas `Role.ADMIN` e `Role.USER`.
- [src/auth/dto/register.dto.ts](file:///c:/Users/User/Documents/AgendaSpace/src/auth/dto/register.dto.ts): Validação `@IsIn(['ADMIN', 'USER'])`.
- [src/spaces/spaces.controller.ts](file:///c:/Users/User/Documents/AgendaSpace/src/spaces/spaces.controller.ts): `@Post()` usa apenas `@UseGuards(JwtAuthGuard)`, permitindo que qualquer usuário autenticado crie espaços.
- [src/spaces/spaces.service.ts](file:///c:/Users/User/Documents/AgendaSpace/src/spaces/spaces.service.ts): Verifica autorização comparando explicitamente o campo do schema `space.createdById !== userId && role !== 'ADMIN'`.

### 3.4. Frontend React
- [src/components/auth/RegisterForm.tsx](file:///c:/Users/User/Documents/AgendaSpace/src/components/auth/RegisterForm.tsx): Papel padrão fixado em `USER`; removida seleção de "Locatário" da tela de cadastro.
- [src/components/layout/Header.tsx](file:///c:/Users/User/Documents/AgendaSpace/src/components/layout/Header.tsx): Links de navegação atualizados para exibir "Meus Espaços" para o usuário regular.
- **Gargalo Identificado no Frontend:** A rota `/admin/spaces` em [src/App.tsx](file:///c:/Users/User/Documents/AgendaSpace/src/App.tsx) ainda está protegida por `<ProtectedRoute requireAdmin>`, impedindo que um usuário comum acerte a página para anunciar ou gerenciar seus espaços. Essa trava precisa ser corrigida na etapa de rotas/autorização.

---

## 4. Auditoria dos 10 Problemas Publicados vs Confirmação Local

| # | Problema Publicado | Situação no Código Local | Diagnóstico e Detalhamento |
|---|-------------------|--------------------------|----------------------------|
| 1 | **Módulos `users` e `upload` ausentes** | ✅ **Resolvido Localmente** | Ambos os módulos foram implementados em [src/users](file:///c:/Users/User/Documents/AgendaSpace/src/users) e [src/upload](file:///c:/Users/User/Documents/AgendaSpace/src/upload), registrados no [src/app.module.ts](file:///c:/Users/User/Documents/AgendaSpace/src/app.module.ts) e estão ativos. |
| 2 | **`bookings.api.ts` ausente** | ✅ **Resolvido Localmente** | Criado em [src/lib/bookings.api.ts](file:///c:/Users/User/Documents/AgendaSpace/src/lib/bookings.api.ts) com todas as chamadas tipadas via Axios (`fetchBookings`, `fetchBookingById`, `createBooking`, `updateBookingStatus`, `fetchSpaceBookings`). |
| 3 | **Wrapper Supabase que engole erros** | ⚠️ **Parcial / Resolvido nos componentes** | O arquivo legado [src/integrations/supabase/client.ts](file:///c:/Users/User/Documents/AgendaSpace/src/integrations/supabase/client.ts) ainda engole erros com `.catch(() => ({ data: null, error: null }))`, porém **nenhum componente do frontend o importa mais**. Todos os componentes usam os novos clientes HTTP com tratamento de erro via toasts. O arquivo legado pode ser expurgado com segurança. |
| 4 | **`profile` inexistente no `AuthContext`** | ⚠️ **Parcial** | O [AuthContext.tsx](file:///c:/Users/User/Documents/AgendaSpace/src/contexts/AuthContext.tsx) expõe `user: AuthUser` contendo `fullName`, `email`, `avatarUrl` e `role`. Não existe alias `profile`, mas a maioria dos componentes já acessa `user.*`. Identificado apenas no [AdminDashboard.tsx](file:///c:/Users/User/Documents/AgendaSpace/src/components/dashboard/AdminDashboard.tsx) um fallback residual `booking.profiles?.full_name`. |
| 5 | **DTOs snake_case vs camelCase** | ✅ **Resolvido Localmente** | O Prisma mapeia colunas como `start_datetime`, `end_datetime`, `total_price` para propriedades camelCase (`startDatetime`, `endDatetime`, `totalPrice`). Os DTOs de entrada no NestJS e os payloads do Axios estão alinhados em camelCase, com fallbacks defensivos implementados nos formulários. |
| 6 | **Rota de status divergente** | ✅ **Resolvido Localmente** | O backend expõe `PATCH /bookings/:id` recebendo `{ status: BookingStatus }`, consumido pelo frontend em `updateBookingStatus` sem divergência de rota. |
| 7 | **`TENANT` / `requireTenant` remanescentes** | ✅ **Resolvido Localmente** | `requireTenant` possui 0 ocorrências no código. `TENANT` permanece apenas como histórico na migration inicial `20260924003240_init` e em um comentário de JSDoc em [src/lib/spaces.api.ts](file:///c:/Users/User/Documents/AgendaSpace/src/lib/spaces.api.ts#L65). |
| 8 | **Feed mock** | ❌ **Confirmado Problema Local no Frontend** | O backend NestJS possui serviço real completo [FeedService](file:///c:/Users/User/Documents/AgendaSpace/src/feed/feed.service.ts) persistindo no MongoDB via Mongoose. No entanto, a tela [src/pages/Feed.tsx](file:///c:/Users/User/Documents/AgendaSpace/src/pages/Feed.tsx) **ainda utiliza arrays estáticos em memória (`INITIAL_POSTS`, `MOCK_SPACES`)** e não invoca os endpoints da API. |
| 9 | **Conflito sem atomicidade e bloqueio de disponibilidade** | ❌ **Confirmado Problema Local Crítico** | Três falhas críticas identificadas no fluxo de reservas:<br/>1. [BookingsService.findBySpace](file:///c:/Users/User/Documents/AgendaSpace/src/bookings/bookings.service.ts#L142) inclui `PENDING` na consulta de horários bloqueados, violando a regra de negócio *(PENDING não pode bloquear disponibilidade)*.<br/>2. Em [BookingsService.updateStatus](file:///c:/Users/User/Documents/AgendaSpace/src/bookings/bookings.service.ts#L236), a verificação de conflito (`findFirst`) e a atualização (`update`) ocorrem fora de uma `$transaction` com isolamento, permitindo concorrência descontrolada (TOCTOU).<br/>3. Em `updateStatus`, o cliente da reserva recebe **403 Forbidden** ao tentar confirmar a própria reserva via `PaymentDialog`, pois o código só permite ao cliente mudar para `CANCELLED`. |
| 10 | **Métricas artificiais** | ❌ **Confirmado Problema Local** | No [AdminDashboard.tsx](file:///c:/Users/User/Documents/AgendaSpace/src/components/dashboard/AdminDashboard.tsx#L60), há injeção artificial de usuário: `if (spacesData.length > 0) uniqueUserIds.add('owner'); activeUsers: Math.max(uniqueUserIds.size, 1);`. Além disso, [Reports.tsx](file:///c:/Users/User/Documents/AgendaSpace/src/pages/admin/Reports.tsx) calcula relatórios inteiramente no cliente via filtros em memória, sem agregações analíticas no servidor. |

---

## 5. Auditoria de Configuração e Compilação

### 5.1. Comandos Disponíveis no `package.json`
- `npm run dev`: Executa simultaneamente frontend (`vite`) e backend (`nest start --watch`) via `concurrently`.
- `npm run dev:frontend`: Inicia o Vite na porta 8080.
- `npm run build`: Executa `vite build`.
- `npm run prestart:dev`: Injeta `{"type": "commonjs"}` em `dist/package.json`.
- `npm run start:dev`: Inicia o NestJS em modo watch.
- `npm run start:prod`: Inicia o servidor compilado `node dist/main`.
- `npm run prisma:generate`: Gera os clientes Prisma.
- `npm run prisma:migrate`: Aplica migrações pendentes no MySQL.
- `npm run lint`: Executa o ESLint.

### 5.2. Verificações de Compilação Realizadas (Sem alterar o banco de dados)

| Verificação | Comando | Resultado | Observações |
|-------------|---------|-----------|-------------|
| **Frontend TypeScript** | `npx tsc -p tsconfig.app.json --noEmit` | ✅ **0 erros** (Exit code 0) | Tipagem React, componentes Radix e rotas íntegros. |
| **Backend TypeScript** | `npx tsc -p tsconfig.build.json --noEmit` | ✅ **0 erros** (Exit code 0) | Módulos NestJS, decorators, DTOs e Prisma íntegros. |
| **Frontend Production Build** | `npm run build` | ✅ **Sucesso** (34.27s) | Gera `dist/index.html` (1.14 kB), `dist/assets/index.css` (69 kB), `dist/assets/index.js` (750 kB). |
| **Backend Nest Build** | `npx nest build` | ✅ **Sucesso** (Exit code 0) | Compilação CommonJS para `dist/` íntegra. |

### 5.3. Conflito Arquitetural Identificado no Diretório `dist/`
- O arquivo raiz `package.json` possui `"type": "module"`.
- O NestJS compila para CommonJS no diretório `./dist`.
- Ao rodar `npm run build` (Vite), o Vite apaga o diretório `./dist` por padrão (`emptyOutDir: true`), destruindo o arquivo `dist/package.json` gerado pelo `prestart:dev` e os artefatos compilados do NestJS.
- **Ação recomendada para a etapa de build/configuração:** Configurar o `vite.config.ts` com `build: { outDir: 'dist-client' }` ou ajustar os diretórios de saída para isolar a compilação do frontend da compilação do NestJS (`dist/`).

### 5.4. Verificação de Portas e Serviços
- **Backend NestJS:** Ativo na porta `http://localhost:3000`. Testado via `Invoke-RestMethod` respondendo com cabeçalhos HTTP corretos.
- **Frontend Vite:** Ativo na porta `http://localhost:8080`.
- **MySQL:** Conexão ativa no host local na porta `3306` (esquema `agendaspace`).
- **MongoDB:** Conexão de cluster remota ativa via Mongoose URI configurada.

### 5.5. Auditoria de Segredos e Variáveis de Ambiente
As variáveis do arquivo [.env](file:///c:/Users/User/Documents/AgendaSpace/.env) foram auditadas com sigilo preservado:
- `VITE_API_URL`: Aponta para `http://localhost:3000`.
- `DATABASE_URL`: `mysql://root:***@localhost:3306/agendaspace` (credencial local mascarada).
- `MONGODB_URI`: `mongodb+srv://***:***@cluster0.l3m1sj1.mongodb.net/agendaspace` (credenciais de cluster mascaradas).
- `JWT_SECRET`: Chave secreta configurada para validação de tokens JWT.

---

## 6. Conclusão da Etapa 0

A auditoria confirma que a base de código do AgendaSpace está estruturalmente recuperável e apta para as intervenções corretivas. Os bloqueios que impediam a compilação no branch publicado remoto já foram superados localmente. O foco das próximas etapas deve se concentrar na correção de regras de negócio (atomicidade e disponibilidade nas reservas), autorização do cliente no pagamento simulado, conexão real do Feed com o MongoDB no frontend e ajuste das permissões de rota para o Modelo Airbnb.

---

## 7. Execução e Conclusão da Etapa 2: Modelo Airbnb de Conta Única

- **Banco de Dados (MySQL / Prisma):**
  - Migration incremental segura criada e aplicada via `prisma migrate deploy`: `20261001000000_remove_tenant_role`.
  - Executou `UPDATE users SET role = 'USER' WHERE role = 'TENANT';` antes de alterar a enum no MySQL para `ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER'`.
  - Nenhuma perda de linhas, usuários, espaços, reservas ou chaves estrangeiras.
  - Removido `TENANT` do schema Prisma e do código ativo.
- **Segurança de Autenticação e Papéis:**
  - `RegisterDto` não expõe `role` e o NestJS rejeita propriedades não listadas com HTTP 400.
  - `AuthService.register` força `role: 'USER'`.
  - `ADMIN` não pode ser autoatribuído no cadastro público nem por usuários comuns via PATCH `/profiles/:id`.
  - JWT inclui `sub`, `email`, `role`.
  - `JwtStrategy` e `/auth/me` consultam o banco a cada verificação, refletindo alterações dinâmicas de papel imediatamente sem requerer reemissão de token.
- **Autorização por Propriedade no Backend:**
  - `SpacesService.update` e `SpacesService.remove` verificam `space.createdById !== userId && role !== 'ADMIN'`. Usuários não podem editar nem remover espaços de terceiros (HTTP 403).
  - `BookingsService.findByClient` e `findByHost` separam estritamente reservas feitas como cliente e reservas recebidas como anfitrião.
  - `BookingsService.findOne` restringe o acesso ao cliente dono da reserva, anfitrião dono do espaço ou administrador global.
  - `BookingsService.updateStatus` permite ao cliente confirmar (pagamento simulado) ou cancelar, e ao anfitrião/admin aprovar, concluir ou cancelar.
- **Roteamento e Interface:**
  - `/spaces`: Catálogo Explorar aberto e sem filtro por usuário logado.
  - `/my-bookings`: Minhas reservas como cliente.
  - `/my-spaces`: Meus espaços anunciados como anfitrião (usando `mode="host"` em `AdminSpaces`).
  - `/host/bookings`: Reservas recebidas nos espaços do anfitrião com ações de aprovação/recusa.
  - `/admin/*`: Estritamente protegido para usuários com role `ADMIN`.
  - Redirecionamentos legados implementados (`/host/spaces` -> `/my-spaces`, `/user/spaces` -> `/spaces`, `/user/my-bookings` -> `/my-bookings`).
- **Validação Automatizada:**
  - Testes de integração cobrindo os 13 cenários de aceitação executados com 100% de sucesso.
  - Typecheck backend e frontend: 0 erros (`npm run typecheck`).
  - Build de produção backend e frontend: 0 erros (`npm run build`).

