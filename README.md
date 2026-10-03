# 🗓️ AgendaSpace — Gestão e Compartilhamento de Espaços

> **Plataforma completa para gestão, reserva e compartilhamento de espaços sob o modelo de conta unificada (Airbnb-style), combinando arquitetura híbrida de banco de dados (MySQL + MongoDB) e interface moderna em React + NestJS.**

[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![NestJS](https://img.shields.io/badge/Backend-NestJS%2012-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%205-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MySQL](https://img.shields.io/badge/Database-MySQL%208%20%2B%20Prisma-4479A1?logo=mysql&logoColor=white)](https://www.prisma.io/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20via%20Mongoose-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![TailwindCSS](https://img.shields.io/badge/Styling-TailwindCSS%20%2B%20shadcn%2Fui-06B6D4?logo=tailwindcss&logoColor=white)](https://ui.shadcn.com/)

---

## 🎥 Demonstração em Vídeo
Assista ao fluxo de uso e visão geral da plataforma:  
🔗 **[Vídeo Demonstração no Google Drive](https://drive.google.com/file/d/1hw5_MUbcGn4807LvWwtNBhWdivPVq272/view?usp=drive_link)**

---

## 📑 Sumário

- [🛠️ Stack Tecnológica](#️-stack-tecnológica)
- [🏛️ Arquitetura do Sistema](#️-arquitetura-do-sistema)
- [✨ Funcionalidades Detalhadas](#-funcionalidades-detalhadas)
  - [1. Conta Única (Modelo Airbnb)](#1-conta-única-modelo-airbnb)
  - [2. Gestão e Catálogo de Espaços](#2-gestão-e-catálogo-de-espaços)
  - [3. Motor de Reservas e Concorrência ACID](#3-motor-de-reservas-e-concorrência-acid)
  - [4. Pagamento Simulado e Contrato Digital](#4-pagamento-simulado-e-contrato-digital)
  - [5. Feed Social da Comunidade (NoSQL)](#5-feed-social-da-comunidade-nosql)
  - [6. Painel Administrativo e Relatórios](#6-painel-administrativo-e-relatórios)
  - [7. Sistema de Upload e Resiliência de Mídia](#7-sistema-de-upload-e-resiliência-de-mídia)
- [🔌 Contratos e Endpoints da API REST](#-contratos-e-endpoints-da-api-rest)
- [⚡ Guia de Instalação e Execução Local](#-guia-de-instalação-e-execução-local)
- [📁 Estrutura de Pastas do Projeto](#-estrutura-de-pastas-do-projeto)
- [📜 Scripts Disponíveis](#-scripts-disponíveis)
- [🔒 Segurança, Regras de Negócio e Limitações](#-segurança-regras-de-negócio-e-limitações)
- [👨‍💻 Autores](#-autores)

---

## 🛠️ Stack Tecnológica

### Frontend
- **Framework & Build:** [React 18](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Estilização & UI:** [TailwindCSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/) (Radix UI primitives), [Lucide React](https://lucide.dev/)
- **Gerenciamento de Estado & Dados:** [TanStack React Query v5](https://tanstack.com/query/latest), React Context API
- **Formulários & Validação:** [React Hook Form](https://react-hook-form.com/), [Zod](https://zod.dev/)
- **Visualização de Dados:** [Recharts](https://recharts.org/) (Gráficos interativos de evolução e receita)
- **Carrosséis & Mídia:** [Embla Carousel](https://www.embla-carousel.com/), WebRTC / `navigator.mediaDevices` para captura ao vivo via webcam

### Backend
- **Core:** [NestJS 12](https://nestjs.com/) (Express platform) com arquitetura modular
- **Autenticação:** [Passport](http://www.passportjs.org/) + `@nestjs/jwt` (JWT Bearer tokens com decorators customizados e Guards de autorização)
- **Banco Relacional:** [MySQL 8+](https://www.mysql.com/) gerenciado via [Prisma ORM](https://www.prisma.io/)
- **Banco NoSQL:** [MongoDB 6+](https://www.mongodb.com/) integrado com `@nestjs/mongoose` e [Mongoose](https://mongoosejs.com/)
- **Upload:** `multer` com validação estrita de MIME type, tamanho e isolamento em buckets locais
- **Criptografia:** `bcrypt` para hash de senhas (salt rounds = 10)

---

## 🏛️ Arquitetura do Sistema

O AgendaSpace emprega uma **arquitetura híbrida de persistência**, separando dados transacionais com garantia ACID de dados sociais de alta escrita e flexibilidade documental:

```
                                  ┌───────────────────────────┐
                                  │      React 18 + Vite      │
                                  │   (Tailwind + shadcn/ui)  │
                                  └─────────────┬─────────────┘
                                                │ HTTP / REST (Axios)
                                                ▼
                                  ┌───────────────────────────┐
                                  │     NestJS API Gateway    │
                                  │   (Guards, Pipes, JWT)    │
                                  └──────┬─────────────┬──────┘
                                         │             │
                    Prisma ORM (ACID)    │             │   Mongoose (ODM)
                                         ▼             ▼
                           ┌───────────────────┐ ┌───────────────────┐
                           │   MySQL 8+ (RDB)  │ │   MongoDB (NoSQL) │
                           │ ───────────────── │ │ ───────────────── │
                           │ • Usuários        │ │ • Posts do Feed   │
                           │ • Espaços         │ │ • Comentários     │
                           │ • Reservas        │ │ • Curtidas        │
                           │ • Pagamentos      │ │ • Denúncias       │
                           │ • Contratos       │ │ • Posts Ocultos   │
                           │ • Imagens Espaços │ └───────────────────┘
                           └───────────────────┘
```

### Por que a arquitetura híbrida?
1. **MySQL (Prisma ORM):** Utilizado onde consistência estrita, integridade referencial e transações financeiras/de reserva são fundamentais. Implementa travas pessimistas (`SELECT ... FOR UPDATE`) contra overbooking e garante unicidade de pagamentos e termos contratuais.
2. **MongoDB (Mongoose):** Utilizado para o ecossistema do feed comunitário. Permite consultas por cursor, alta volumetria de reações (likes com chave composta única) e evolução dinâmica de postagens, denúncias e comentários sem overhead em migrações relacionais.

---

## ✨ Funcionalidades Detalhadas

### 1. Conta Única (Modelo Airbnb)
- **Papel Unificado (`USER`):** Qualquer usuário registrado pode, na mesma sessão:
  - Explorar e reservar espaços criados por outros membros da plataforma (atuando como **Cliente**).
  - Criar, precificar e gerenciar seus próprios espaços disponíveis para locação (atuando como **Anfitrião**).
  - Acompanhar reservas efetuadas e reservas recebidas em painéis dedicados com cálculo automático de métricas.
- **Papel Administrativo (`ADMIN`):**
  - Perfil de governança com permissões ampliadas: visualização de todos os espaços, todas as reservas, relatórios consolidados da plataforma e gestão de usuários.
  - Criado através de rotina de seed protegida (não selecionável no cadastro público).

---

### 2. Gestão e Catálogo de Espaços
- **Cadastro e Edição Completa:** Nome, descrição detalhada, capacidade máxima de ocupação, preço por hora (`Decimal`), lista dinâmica de comodidades/recursos (Wi-Fi, projetor, ar-condicionado, acessibilidade, etc.) e múltiplas fotos.
- **Carrossel de Fotos e Galeria:**
  - Suporte a múltiplas imagens por espaço com reordenação de posições.
  - Carrossel interativo (`Embla Carousel`) na página de detalhes e cards de listagem.
  - Modal de ampliação em tela cheia (Lightbox) para conferência de alta resolução.
- **Filtros e Busca em Tempo Real:** Pesquisa textual, filtragem por faixa de preço, capacidade mínima e comodidades requeridas.
- **Ativação e Desativação:** Anfitriões e administradores podem pausar e reativar a visibilidade de anúncios instantaneamente.

---

### 3. Motor de Reservas e Concorrência ACID
- **Slots Inteligentes:** Agendamentos de hora cheia das **08:00 às 22:00**, duração configurável até 8 horas contínuas e exigência de antecedência mínima de 1 hora.
- **Cálculo Seguro no Backend:** O valor total (`totalPrice`) é determinado exclusivamente pelo servidor com base na duração e no `pricePerHour` original do espaço, prevenindo adulteração client-side.
- **Fluxo em 2 Etapas (Aprovação & Pagamento):**
  1. Criação da reserva (Status `PENDING` e Aprovação `PENDING`).
  2. O anfitrião pode aprovar (`APPROVED`) ou rejeitar (`REJECTED`) a reserva.
  3. O cliente pode realizar o pagamento no momento da reserva ou pagar posteriormente em "Minhas Reservas".
  4. A reserva é promovida a `CONFIRMED` apenas quando o pagamento e a aprovação forem concluídos.
- **Concorrência Segura (Anti Double-Booking):** Confirmação de reserva protegida por transações atômicas MySQL com bloqueio de leitura/escrita (`SELECT ... FOR UPDATE`).
- **Política de Cancelamento:** Cancelamento liberado para o cliente até 2 horas antes do horário de início da reserva.

---

### 4. Pagamento Simulado e Contrato Digital
- **Simulação Acadêmica de Checkout:**
  - **PIX:** Geração de Payload "Copia e Cola" e exibição de QR Code de demonstração.
  - **Cartão de Crédito:** Interface interativa para preenchimento de dados de teste.
- **Garantia de Idempotência:** Cada tentativa de pagamento carrega uma `idempotencyKey` única para proteger contra disparos duplicados ou oscilações de rede.
- **Aceite de Contrato Digital:** Registro formal em banco de dados contendo a versão dos termos, texto acordado com dados reais da locação, data/hora exata e endereço IP do solicitante.

---

### 5. Feed Social da Comunidade (NoSQL)
- **Criação de Posts com Câmera ou Upload:**
  - **Câmera ao Vivo (Desktop):** Utiliza `navigator.mediaDevices.getUserMedia` para exibir preview em tempo real e tirar fotos via webcam sem recarregar a página.
  - **Captura Nativa (Mobile):** Input otimizado com atributo `capture` para disparar a câmera nativa do smartphone.
  - **Fluxo de Pré-visualização:** Permite conferir, refazer a foto ou removê-la antes de submeter a publicação.
- **Vínculo com Espaço:** Busca preditiva com miniatura e seleção do espaço associado ao post.
- **Engajamento:** Curtidas idempotentes (índice composto `postId + authorId`), listagem paginada de comentários e contadores em tempo real.
- **Moderação e Denúncias:** Ocultação de posts indesejados, envio de denúncias para análise da moderação e exclusão em cascata (comentários e likes removidos com o post).

---

### 6. Painel Administrativo e Relatórios
- **Gestão de Espaços (`/admin/spaces`):** Visão geral de todos os espaços cadastrados na plataforma com miniaturas, autor do anúncio, capacidade e ações rápidas de moderação.
- **Gestão de Reservas (`/admin/bookings`):**
  - Modal avançado de inspeção (`BookingDetailsDialog`) exibindo fotos do espaço, detalhes do cliente, anfitrião, status de aprovação, transação de pagamento e aceite do contrato.
- **Gestão de Usuários (`/admin/users`):**
  - Banimento e desbanimento de usuários através de **Soft Delete** (`is_deleted`, `deleted_at`).
  - Bloqueio imediato de autenticação para usuários banidos (`auth.service.ts`).
  - Alteração de papéis (`USER` ↔ `ADMIN`) com trava de proteção contra a exclusão ou rebaixamento do último administrador.
- **Relatórios Analíticos (`/admin/reports`):**
  - Métricas agregadas (total de reservas, taxa de aprovação, faturamento global).
  - Histórico de reservas recentes com fotos dos espaços.
  - **Gráficos Visuais com Recharts:**
    - Aba **Reservas:** Gráfico de Área/Linhas demonstrando o volume de reservas no tempo.
    - Aba **Receita:** Gráfico de Barras detalhando o faturamento diário/mensal acumulado.

---

### 7. Sistema de Upload e Resiliência de Mídia
- **Buckets Segregados:** Armazenamento organizado em `public/uploads/spaces/`, `public/uploads/avatars/` e `public/uploads/feed/`.
- **Validação:** Checagem rigorosa de formato (JPEG, PNG, WebP, GIF, SVG) e limites de tamanho (10 MB para espaços/feed, 5 MB para avatares).
- **Componente `SpaceImage` com Fallback:** Tratamento inteligente em toda a aplicação para exibir a identidade visual padrão do AgendaSpace caso uma URL externa ou arquivo local esteja corrompido ou ausente.

---

## 🔌 Contratos e Endpoints da API REST

Todas as requisições autenticadas requerem o header `Authorization: Bearer <token_jwt>`.

### 🔑 Autenticação (`/auth`)
| Método | Endpoint | Descrição | Acesso |
|---|---|---|---|
| `POST` | `/auth/register` | Cadastra um novo usuário com papel `USER` | Público |
| `POST` | `/auth/login` | Autentica com email e senha e retorna o token JWT | Público |
| `GET` | `/auth/me` | Retorna o payload decodificado do token atual | Autenticado |

### 🏢 Espaços (`/spaces`)
| Método | Endpoint | Descrição | Acesso |
|---|---|---|---|
| `GET` | `/spaces?activeOnly=true&q=termo` | Lista espaços do catálogo público com busca | Público |
| `GET` | `/spaces/mine` | Lista os espaços cadastrados pelo usuário autenticado | Anfitrião |
| `GET` | `/spaces/:id` | Retorna os detalhes completos de um espaço específico | Público / Autenticado |
| `POST` | `/spaces` | Cria um novo espaço | Autenticado |
| `PATCH` | `/spaces/:id` | Atualiza informações de um espaço próprio | Dono / ADMIN |
| `DELETE` | `/spaces/:id` | Realiza soft delete de um espaço | Dono / ADMIN |

### 📅 Reservas (`/bookings`)
| Método | Endpoint | Descrição | Acesso |
|---|---|---|---|
| `POST` | `/bookings` | Solicita uma nova reserva de espaço | Autenticado |
| `GET` | `/bookings/my-bookings` | Lista as reservas feitas pelo usuário como cliente | Cliente |
| `GET` | `/bookings/host` | Lista as reservas recebidas nos espaços do usuário | Anfitrião |
| `GET` | `/bookings?type=client\|host` | Listagem geral (todas as reservas se ADMIN) | Autenticado |
| `GET` | `/bookings/space/:spaceId?date=YYYY-MM-DD` | Consulta disponibilidade e slots ocupados | Autenticado |
| `GET` | `/bookings/:id` | Obtém detalhes completos e contrato da reserva | Participantes / ADMIN |
| `PATCH` | `/bookings/:id` | Atualiza status (ex: aprovação do anfitrião ou cancelamento) | Participantes / ADMIN |
| `POST` | `/bookings/:id/pay` | Executa o pagamento simulado e assina o contrato | Cliente da reserva |

### 💬 Feed Social (`/feed`)
| Método | Endpoint | Descrição | Acesso |
|---|---|---|---|
| `GET` | `/feed/posts?limit=10&cursor=ID` | Lista postagens globais com paginação por cursor | Autenticado |
| `GET` | `/feed/spaces/:spaceId` | Lista postagens associadas a um espaço específico | Autenticado |
| `POST` | `/feed/posts` | Publica uma nova foto com texto no feed | Autenticado |
| `POST` | `/feed/posts/:postId/like` | Alterna curtida na publicação (Toggle Like) | Autenticado |
| `GET` | `/feed/posts/:postId/comments` | Lista comentários paginados de um post | Autenticado |
| `POST` | `/feed/posts/:postId/comments` | Adiciona um comentário na publicação | Autenticado |
| `POST` | `/feed/posts/:postId/report` | Registra uma denúncia sobre a publicação | Autenticado |
| `POST` | `/feed/posts/:postId/hide` | Oculta a publicação no feed do usuário | Autenticado |
| `DELETE` | `/feed/posts/:postId` | Remove a publicação (com cascata em comentários) | Autor / Dono / ADMIN |
| `DELETE` | `/feed/comments/:commentId` | Remove um comentário | Autor / Dono / ADMIN |

### 👥 Usuários e Perfis (`/profiles`)
| Método | Endpoint | Descrição | Acesso |
|---|---|---|---|
| `GET` | `/profiles` | Lista todos os usuários da plataforma | Apenas ADMIN |
| `GET` | `/profiles/:id` | Retorna o perfil de um usuário específico | Autenticado |
| `PATCH` | `/profiles/:id` | Atualiza dados cadastrais (e papel se ADMIN) | Próprio / ADMIN |
| `DELETE` | `/profiles/:id` | Bane/desativa um usuário (Soft Delete) | Apenas ADMIN |
| `PATCH` | `/profiles/:id/restore` | Reativa um usuário banido | Apenas ADMIN |

### 📊 Painéis e Métricas (`/dashboard`)
| Método | Endpoint | Descrição | Acesso |
|---|---|---|---|
| `GET` | `/dashboard/stats` | Métricas consolidadas, receita e gráficos | Apenas ADMIN |
| `GET` | `/dashboard/host` | Resumo de espaços, reservas recebidas e ganhos | Anfitrião |
| `GET` | `/dashboard/client` | Próximas reservas e horas utilizadas | Cliente |

### 📁 Upload (`/upload`)
| Método | Endpoint | Descrição | Acesso |
|---|---|---|---|
| `POST` | `/upload/:bucket` | Upload multipart (`spaces`, `avatars`, `feed`) | Autenticado |

---

## ⚡ Guia de Instalação e Execução Local

### 📌 Pré-requisitos
- **Node.js:** Versão 18.x ou superior (LTS recomendado)
- **MySQL:** Versão 8.0+ em execução local ou via container
- **MongoDB:** Versão 6.0+ em execução local ou MongoDB Atlas
- **npm:** Versão 9+

---

### 1️⃣ Clonar o Repositório e Instalar Dependências
```bash
git clone https://github.com/gabriel-wav/AgendaSpace.git
cd AgendaSpace
npm install
```

---

### 2️⃣ Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto a partir do modelo `.env.example`:

```bash
cp .env.example .env
```

Preencha as variáveis de acordo com suas credenciais locais:

```env
# Porta da API NestJS
PORT=3000

# Conexão MySQL (Prisma ORM)
DATABASE_URL="mysql://root:sua_senha@localhost:3306/agendaspace"

# Conexão MongoDB (Mongoose)
MONGODB_URI="mongodb://localhost:27017/agendaspace"

# Autenticação JWT
JWT_SECRET="agendaspace_super_secret_jwt_key_minimo_32_caracteres"
JWT_EXPIRES_IN="7d"

# Credenciais do Administrador Inicial (Seed)
ADMIN_EMAIL="admin@agendaspace.com"
ADMIN_PASSWORD="AdminPassword123!"
ADMIN_NAME="Administrador Geral"
```

---

### 3️⃣ Aplicar Migrations e Gerar o Prisma Client
Execute as migrações no banco de dados MySQL e gere a tipagem do cliente:

```bash
# Executa migrações estruturais preservando dados existentes
npx prisma migrate deploy

# Gera os tipos TypeScript atualizados do Prisma
npx prisma generate
```

> ⚠️ **Importante:** Nunca utilize `npx prisma migrate reset` em ambientes com dados que você queira manter.

---

### 4️⃣ Executar o Seed Inicial
Gere o usuário administrador inicial e dados essenciais:

```bash
npx ts-node prisma/seed.ts
```

---

### 5️⃣ Iniciar a Aplicação

Para executar o **Frontend** e o **Backend** simultaneamente em modo desenvolvimento:

```bash
npm run dev
```

Ou execute cada serviço em terminais separados:

```bash
# Terminal 1: Backend NestJS (Porta 3000 com Watch Mode)
npm run dev:backend

# Terminal 2: Frontend Vite (Porta 8080 com Hot Module Replacement)
npm run dev:frontend
```

Acesse a aplicação no navegador:  
👉 **Frontend:** `http://localhost:8080`  
👉 **API Backend:** `http://localhost:3000`

---

### 6️⃣ Verificação de Tipos e Integridade
Para validar a tipagem TypeScript em ambos os ecossistemas:

```bash
npm run typecheck
```

---

## 📁 Estrutura de Pastas do Projeto

```
AgendaSpace/
├── src/
│   ├── auth/                 # Módulo de Autenticação JWT, DTOs, Guards e Estratégias
│   │   ├── decorators/       # @CurrentUser, @Roles
│   │   ├── guards/           # JwtAuthGuard, RolesGuard, OptionalJwtAuthGuard
│   │   └── dto/              # LoginDto, RegisterDto
│   ├── bookings/             # Módulo de Reservas, Concorrência e Pagamentos
│   ├── dashboard/            # Endpoints de Métricas, Estatísticas e Relatórios
│   ├── feed/                 # Módulo de Feed Comunitário (MongoDB / Mongoose)
│   │   └── schemas/          # Schemas Mongoose (Post, Comment, Like, Report, HiddenPost)
│   ├── spaces/               # Módulo de Espaços e Comodidades
│   ├── upload/               # Serviço e Controller de Upload de Imagens com Multer
│   ├── users/                # Módulo de Perfis, Soft Delete e Banimento de Usuários
│   ├── prisma/               # PrismaService global compartilhado
│   ├── components/           # Componentes de UI em React
│   │   ├── auth/             # Componentes de controle de acesso (ProtectedRoute)
│   │   ├── bookings/         # BookingDetailsDialog, formulários de reserva
│   │   ├── feed/             # NewPostInput com Câmera ao Vivo, PostCard, Comentários
│   │   ├── spaces/           # SpaceCard, SpaceImage com Fallback, Filtros
│   │   └── ui/               # Componentes primitivos do shadcn/ui
│   ├── contexts/             # AuthContext (gerenciamento global da sessão do usuário)
│   ├── hooks/                # Hooks customizados (useFileUpload, useToast, etc.)
│   ├── lib/                  # Clientes de API tipados com Axios (spaces, bookings, feed, users)
│   ├── pages/                # Páginas da aplicação
│   │   ├── admin/            # Telas do Administrador (Spaces, Bookings, Users, Reports)
│   │   ├── host/             # Telas do Anfitrião (MySpaces, ReceivedBookings)
│   │   ├── user/             # Telas do Cliente (Spaces, MyBookings)
│   │   ├── Feed.tsx          # Feed Social
│   │   ├── Dashboard.tsx     # Dashboard unificado
│   │   └── Settings.tsx      # Configurações de Perfil e Conta
│   ├── App.tsx               # Roteamento e Provedores Globais
│   └── main.tsx              # Ponto de entrada do Frontend
├── prisma/
│   ├── schema.prisma         # Modelagem relacional do MySQL
│   ├── migrations/           # Histórico de migrações versionadas
│   └── seed.ts               # Script de povoamento inicial do ADMIN
├── public/
│   ├── logo.svg              # Identidade visual da AgendaSpace
│   └── uploads/              # Armazenamento local de mídias (spaces, avatars, feed)
├── docs/                     # Documentação técnica e relatórios de validação
├── package.json              # Dependências e scripts de automação
├── tailwind.config.ts        # Configuração do TailwindCSS e tokens de design
├── vite.config.ts            # Configurações de build e proxies do Vite
└── tsconfig.json             # Configuração TypeScript
```

---

## 📜 Scripts Disponíveis

| Script | Comando | Descrição |
|---|---|---|
| `dev` | `npm run dev` | Inicia Frontend e Backend simultaneamente com `concurrently` |
| `dev:frontend` | `npm run dev:frontend` | Inicia o servidor de desenvolvimento do Vite |
| `dev:backend` | `npm run dev:backend` | Inicia a API NestJS em modo watch |
| `build` | `npm run build` | Compila o Backend NestJS e gera o bundle de produção do Vite |
| `typecheck` | `npm run typecheck` | Executa o `tsc` em modo `--noEmit` no backend e frontend |
| `prisma:generate`| `npm run prisma:generate` | Regenera os tipos do cliente Prisma |
| `prisma:migrate` | `npm run prisma:migrate` | Cria e aplica migrações no banco de desenvolvimento |
| `prisma:studio`  | `npm run prisma:studio`  | Abre a interface visual do Prisma Studio no navegador |
| `lint` | `npm run lint` | Executa o linter ESLint em todo o código-fonte |

---

## 🔒 Segurança, Regras de Negócio e Limitações

### Segurança e Governança
1. **Proteção contra Escalação de Privilégios:** Usuários não-administradores não conseguem alterar seus próprios papéis (`role`) em requisições de atualização de perfil.
2. **Proteção do Último Administrador:** O sistema bloqueia a desativação ou rebaixamento de papel caso reste apenas um administrador ativo.
3. **Soft Delete de Usuários:** Usuários banidos têm seus tokens rejeitados em tempo de autenticação (`auth.service.ts`) e seus dados são preservados para fins de auditoria.

### Notas Acadêmicas
- **Pagamentos Simulados:** As modalidades PIX e Cartão de Crédito funcionam como simulações para fins acadêmicos e de validação de fluxo — **nenhum dado bancário real é processado ou faturado**.
- **Upload Local:** Os arquivos são persistidos no diretório `public/uploads/` do servidor da aplicação. Em ambientes de produção corporativos, recomenda-se a substituição pelo envio direto a buckets S3/GCS.
- **Transações Não-Distribuídas:** O feed (MongoDB) e as entidades relacionais (MySQL) operam de forma assíncrona; exclusões de postagens realizam a limpeza de suas dependências NoSQL via rotinas dedicadas no serviço.

---

## 👨‍💻 Autores

Projeto desenvolvido e mantido por:

- **Gabriel** — [@gabriel-wav](https://github.com/gabriel-wav)
- **Danilo** — [@danilinhotj187](https://github.com/danilinhotj187)
- **Antonio** — [@Antoniojferreira3](https://github.com/Antoniojferreira3)
- **Pedro H.** — [@pedroH901](https://github.com/pedroH901)
- **Pedro M.** — [@PedroMAnjos](https://github.com/PedroMAnjos)
