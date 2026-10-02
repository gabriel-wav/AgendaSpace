# 🗓️ AgendaSpace

AgendaSpace é uma plataforma completa para gestão de espaços compartilhados com modelo de conta única (Airbnb-style): qualquer usuário autenticado pode anunciar espaços e realizar reservas com a mesma conta.

**🎥 Vídeo Demonstração:** [https://drive.google.com/file/d/1hw5_MUbcGn4807LvWwtNBhWdivPVq272/view?usp=drive_link](https://drive.google.com/file/d/1hw5_MUbcGn4807LvWwtNBhWdivPVq272/view?usp=drive_link)

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui |
| **Backend** | NestJS (Node.js) + TypeScript |
| **BD Relacional** | MySQL 8+ via Prisma ORM |
| **BD NoSQL** | MongoDB via Mongoose (Feed social) |
| **Autenticação** | JWT (RS256/HS256) com `@nestjs/jwt` |
| **Upload** | Multipart local com `multer` — arquivos em `public/uploads/` |
| **Roteamento** | React Router DOM v6 |
| **Formulários** | React Hook Form |

---

## ✨ Funcionalidades Implementadas

### Conta Única (Modelo Airbnb)
- Registro público cria conta com papel **USER** por padrão.
- Qualquer usuário autenticado pode **anunciar espaços** (Meus Espaços), editar, desativar e reativar.
- O mesmo usuário pode ser **cliente** (reservar espaços de outros) e **anfitrião** (receber reservas nos seus espaços) simultaneamente.
- **ADMIN** é um papel de gestão global, atribuído via seed protegido — não acessível pelo registro público.

### Espaços
- CRUD completo: nome, descrição, capacidade, preço/hora, recursos e imagem.
- Upload de imagem via `POST /upload/spaces` (multipart, até 10 MB).
- Catálogo público com filtros por texto, capacidade, preço e recursos.
- Visão global de ADMIN em `/admin/spaces`.

### Reservas
- Formulário com seleção de data, horário (slots de hora cheia entre 08h–22h), duração máxima de 8h, mínimo 1h de antecedência.
- `totalPrice` calculado exclusivamente no backend a partir do `pricePerHour` do espaço.
- `PENDING` **não bloqueia** disponibilidade — conflito verificado apenas ao confirmar/pagar com `SELECT ... FOR UPDATE`.
- Separação estrita de escopos: `GET /bookings/my-bookings` (cliente) e `GET /bookings/host` (anfitrião).
- Cancelamento de reservas pelo cliente com mínimo de 2h de antecedência.

### Pagamento Simulado (Acadêmico) e Contrato
- PIX e Cartão simulados — **nenhum dado real de cobrança é coletado ou armazenado**.
- Contrato com texto real da reserva, datas e preços (sem placeholders).
- Registro persistente em `Payment` e `ContractAcceptance` no MySQL.
- Idempotência via `idempotencyKey` — clique duplicado não gera pagamento duplo.
- Confirmação atômica: transação MySQL com `FOR UPDATE` previne dupla confirmação concorrente.

### Dashboards
- **Cliente:** próximas reservas, horas reservadas, espaços disponíveis.
- **Anfitrião** (embutido no dashboard de usuário): espaços, reservas hoje, receita mensal (simulada).
- **ADMIN:** espaços ativos, reservas hoje, usuários cadastrados, receita mensal — calculados no servidor em `GET /dashboard/stats`.
- **Relatórios** (`/admin/reports`): reservas por status, receita por pagamentos reais via `GET /dashboard/stats`.

### Feed Social (MongoDB)
- Publicações com imagem (upload real via bucket `feed`), texto e espaço associado.
- Curtidas com toggle idempotente (índice composto `postId + authorId` no MongoDB).
- Comentários persistidos e paginados (cursorby `_id`).
- Moderação: autor, dono do espaço (MySQL) ou ADMIN podem excluir posts/comentários.
- Exclusão em cascata (comentários e curtidas) ao excluir um post.

### Usuários e Perfil
- Avatar via upload real (`POST /upload/avatars`, até 5 MB).
- Alteração de papel USER ↔ ADMIN apenas por ADMIN; proteção contra remoção do último ADMIN.
- Atualização de perfil propaga para o AuthContext imediatamente (sem reload).

---

## ⚡ Configuração e Execução Local

### 📌 Pré-requisitos

- **Node.js** 18.x ou superior
- **MySQL** 8+
- **MongoDB** 6+ (local ou Atlas)
- **npm** 9+

### 1️⃣ Clonar e instalar

```bash
git clone <URL_DO_REPOSITÓRIO>
cd AgendaSpace
npm install
```

### 2️⃣ Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite .env com suas credenciais
```

Variáveis obrigatórias (ver `.env.example` para descrição completa):

```env
DATABASE_URL="mysql://usuario:senha@localhost:3306/agendaspace"
MONGODB_URI="mongodb://localhost:27017/agendaspace"
JWT_SECRET="sua_chave_secreta_minimo_32_chars"
```

### 3️⃣ Executar migrations do MySQL (Prisma)

```bash
# Aplicar todas as migrations incrementais (preserva dados existentes)
npx prisma migrate deploy

# Gerar o cliente Prisma após a migration
npx prisma generate
```

> ⚠️ **Nunca use `prisma migrate reset`** em ambiente com dados reais — isso apaga o banco inteiro.

### 4️⃣ Criar a primeira conta ADMIN (seed protegido)

```bash
npx ts-node prisma/seed.ts
```

O seed cria um usuário ADMIN com credenciais configuradas em `.env` (veja `.env.example`).  
**O registro público nunca aceita `role: ADMIN`.**

### 5️⃣ Executar o projeto

```bash
# Desenvolvimento: backend (porta 3000) + frontend (porta 8080) em paralelo
npm run dev

# Ou separadamente:
npm run dev:backend   # NestJS em watch mode
npm run dev:frontend  # Vite HMR
```

### 6️⃣ Verificar tipagem

```bash
npm run typecheck
# typecheck:backend e typecheck:frontend executam separadamente
```

---

## 📁 Estrutura do Projeto

```
AgendaSpace/
├── src/
│   ├── auth/           # NestJS: módulo de autenticação JWT
│   ├── bookings/       # NestJS: módulo de reservas
│   ├── dashboard/      # NestJS: endpoints de métricas/relatórios
│   ├── feed/           # NestJS: módulo Feed (MongoDB/Mongoose)
│   ├── prisma/         # NestJS: PrismaService global
│   ├── spaces/         # NestJS: módulo de espaços
│   ├── upload/         # NestJS: upload de imagens local
│   ├── users/          # NestJS: módulo de usuários/perfis
│   ├── components/     # React: componentes reutilizáveis
│   ├── contexts/       # React: AuthContext
│   ├── hooks/          # React: hooks customizados
│   ├── lib/            # React: clientes de API tipados
│   └── pages/          # React: páginas da aplicação
├── prisma/
│   ├── schema.prisma   # Schema MySQL com Prisma
│   └── migrations/     # Migrations incrementais (não editar as aplicadas)
├── public/uploads/     # Arquivos de upload (gitignored em produção)
├── docs/               # Documentação: contratos, métricas, paridade
└── .env.example        # Modelo de variáveis de ambiente
```

---

## ⚠️ Limitações e Notas Acadêmicas

1. **Pagamento é simulação acadêmica**: Nenhuma transação financeira real ocorre. PIX e cartão exibem referências fictícias claramente marcadas como demonstrativo.
2. **Upload local**: Arquivos são salvos em `public/uploads/` no servidor. Em produção, substitua por um bucket S3/GCS.
3. **Dois bancos de dados (MySQL + MongoDB)**: Não há transação distribuída. A exclusão de posts (MongoDB) com cascata é feita via `Promise.all` — em caso de falha parcial, podem existir curtidas/comentários órfãos no MongoDB. Não há referências SQL apontando para dados Mongo deletados.
4. **Sem 2FA real**: A aba "Segurança" em Configurações exibe switches mas não persiste dados de 2FA (não implementado).
5. **Campos bio/telefone**: Não estão no schema do Prisma — campos exibidos no formulário mas descartados no envio.
6. **Sem notificações reais**: A aba "Notificações" em Configurações é visual; não há integração com email ou push.

---

## 👨‍💻 Autores

- **Gabriel** — [@gabriel-wav](https://github.com/gabriel-wav)
- **Danilo** — [@danilinhotj187](https://github.com/danilinhotj187)
- **Antonio** — [@Antoniojferreira3](https://github.com/Antoniojferreira3)
- **Pedro** — [@pedroH901](https://github.com/pedroH901)
