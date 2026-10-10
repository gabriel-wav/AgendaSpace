# 🗓️ AgendaSpace — Gestão e Compartilhamento de Espaços

> **Plataforma completa para gestão, reserva e compartilhamento de espaços sob o modelo de conta unificada (Airbnb-style), combinando arquitetura híbrida de banco de dados (MySQL + MongoDB) e interface moderna em React + NestJS.**

[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![NestJS](https://img.shields.io/badge/Backend-NestJS%2012-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%205-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MySQL](https://img.shields.io/badge/Database-MySQL%208%20%2B%20Prisma-4479A1?logo=mysql&logoColor=white)](https://www.prisma.io/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20via%20Mongoose-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![TailwindCSS](https://img.shields.io/badge/Styling-TailwindCSS%20%2B%20shadcn%2Fui-06B6D4?logo=tailwindcss&logoColor=white)](https://ui.shadcn.com/)
[![Security](https://img.shields.io/badge/Security-2FA%20%2B%20Password%20Recovery-10B981?logo=shield&logoColor=white)](https://jwt.io/)
[![Email](https://img.shields.io/badge/Email-SMTP%20%2B%20Outbox%20Worker-009688?logo=gmail&logoColor=white)](https://nodemailer.com/)
[![Web Push](https://img.shields.io/badge/Web%20Push-RFC%208030%20(VAPID)-F97316?logo=pwa&logoColor=white)](https://datatracker.ietf.org/doc/html/rfc8030)

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
  - [8. Segurança Avançada, 2FA e Recuperação de Senha](#8-segurança-avançada-2fa-e-recuperação-de-senha)
  - [9. Infraestrutura de Mensageria e Email Transacional (Outbox Worker)](#9-infraestrutura-de-mensageria-e-email-transacional-outbox-worker)
  - [10. Central de Notificações In-App e Web Push (RFC 8030)](#10-central-de-notificações-in-app-e-web-push-rfc-8030)
  - [11. Privacidade, Preferências e Configurações de Perfil](#11-privacidade-preferências-e-configurações-de-perfil)
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

### 8. Segurança Avançada, 2FA e Recuperação de Senha
- **Confirmação Obrigatória de E-mail:**
  - Todo novo cadastro recebe status pendente de verificação (`emailVerifiedAt = null`).
  - O sistema despacha automaticamente um desafio transacional com link assinado e token criptográfico de alta entropia (`crypto.randomBytes(32)`), armazenado sob digest SHA-256 (`AuthChallenge`).
  - **Guards e Proteção de Rotas:** O backend aplica o guard `VerifiedGuard` e o frontend utiliza a flag `requireVerified` em rotas vitais (criação de espaços, reservas, aprovações), redirecionando usuários não verificados para a tela `/check-email` com suporte a reenvio inteligente com cooldown.
- **Autenticação em Dois Fatores (2FA via E-mail):**
  - Usuários podem ativar a proteção em duas etapas no painel de Configurações (`/settings`), mediante confirmação com código OTP de 6 dígitos enviado por e-mail.
  - **Códigos de Recuperação de Emergência:** Ao ativar o 2FA, o sistema gera 8 códigos de backup descartáveis (armazenados como digests SHA-256 em `recovery_codes`), permitindo acesso à conta mesmo sem acesso momentâneo à caixa postal. Suporte a regeneração segura sob senha e código.
  - **Desafio de Login em 2 Etapas:** Quando um usuário com 2FA faz login, o endpoint não expede o token JWT de imediato; em vez disso, retorna `requires2fa: true` com um `challengeToken` de curta duração (5 minutos). A sessão final só é concedida após a validação do código OTP ou de um código de emergência.
- **Recuperação de Senha de Ponta a Ponta (`/forgot-password` e `/reset-password`):**
  - **Página de Solicitação Pública:** Acessível diretamente pelo link *"Esqueci minha senha"* no formulário de login.
  - **Proteção Anti-Enumeração:** O endpoint `POST /auth/password/forgot` retorna exatamente a mesma resposta genérica (*"Se houver uma conta disponível para esse email, enviaremos as instruções de recuperação."*) tanto para e-mails cadastrados quanto para inexistentes, mitigando ataques de força bruta e varredura de usuários.
  - **Imunidade Concorrente (Anti-Race Condition):** A validação e o consumo do token de redefinição são executados dentro de transação atômica MySQL via `tx.authChallenge.updateMany({ where: { tokenDigest, consumedAt: null } })`. Caso duas requisições concorrentes tentem usar o mesmo token em paralelo, apenas uma tem sucesso (`count === 1`) e a outra é imediatamente rejeitada (`count === 0`).
  - **Invalidação Global de Sessões (`authVersion`):** A redefinição de senha incrementa o campo `authVersion` do usuário. O `JwtStrategy` compara esse valor a cada requisição, derrubando instantaneamente todas as sessões e tokens JWT emitidos previamente em outros dispositivos.
  - **Preservação de Integridade:** O processo não altera `role`, `emailVerifiedAt`, `isDeleted` ou `isTwoFactorEnabled`.
  - **Alerta de Segurança:** Ao concluir a redefinição, a fila de mensageria dispara o e-mail transacional `PASSWORD_CHANGED` informando data, horário e orientações de segurança.

---

### 9. Infraestrutura de Mensageria e Email Transacional (Outbox Worker)
- **Padrão Transacional Outbox (`email_outbox`):**
  - Nenhuma requisição HTTP do usuário depende de conexão externa com servidores SMTP. O backend enfileira o e-mail no MySQL dentro da mesma transação de negócio, garantindo entrega resiliente mesmo diante de oscilações de rede ou indisponibilidade temporária do provedor.
- **Worker Assíncrono com Lease Atômico:**
  - O `MailWorker` executa em segundo plano com bloqueio otimista/lease atômico (`locked_until`, `locked_by`), processando lotes com limite de tentativas (`maxAttempts = 3`) e backoff progressivo em caso de falha.
- **Compatibilidade Universal com Provedores SMTP:**
  - Suporta qualquer provedor SMTP padrão da indústria (Brevo / Sendinblue, Mailtrap, Amazon SES, SendGrid, Gmail SMTP ou servidores locais) configurável via variáveis de ambiente (`MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM`, `MAIL_SECURE`).
- **Templates Responsivos e Sanitização XSS:**
  - Mais de 10 templates customizados em HTML e texto plano com escape estrito de caracteres (`escapeHtml`) para prevenir injeção de HTML/XSS:
    - Confirmação de Cadastro (`EMAIL_CONFIRMATION`)
    - Solicitação de Recuperação de Senha (`PASSWORD_RECOVERY`)
    - Notificação de Senha Alterada (`PASSWORD_CHANGED`)
    - Código de Verificação 2FA (`2FA_CODE`)
    - Solicitação, Aprovação, Rejeição, Cancelamento e Confirmação de Reservas (`BOOKING_*`)
    - Lembrete prévio de Reserva (`BOOKING_REMINDER`)
    - Alerta de Novo Login / Ação Sensível (`LOGIN_ALERT`, `SECURITY_ALERT`)
    - Confirmação de Novo E-mail (`EMAIL_CHANGE`)

---

### 10. Central de Notificações In-App e Web Push (RFC 8030)
- **Sino Interativo no Header (`NotificationsBell`):**
  - Exibe contador dinâmico de notificações não lidas em tempo real.
  - Dropdown com pré-visualização das mensagens mais recentes e atalho direto para a central completa.
- **Central Dedicada de Notificações (`/notifications`):**
  - Listagem paginada de avisos in-app com marcação individual ou em massa como lida (*"Marcar todas como lidas"*).
- **Web Push Protocol Nativo (Sem Serviços Pagos):**
  - Em conformidade com as RFCs 8030 e 8291, o sistema utiliza o padrão Web Push W3C com criptografia VAPID nativa (`web-push`). Sem dependência de plataformas proprietárias ou intermediários pagos.
- **PWA e Service Worker (`public/sw.js`):**
  - Suporte a exibição de alertas no sistema operacional mesmo com o navegador em segundo plano ou aba fechada.
  - Compatibilidade com dispositivos móveis e desktop, incluindo suporte ao modo standalone no iOS (PWA adicionado à Tela de Início via `manifest.webmanifest`).
- **Push Outbox e Proteção Contra SSRF:**
  - Notificações push são enfileiradas na tabela `push_outbox` com lease seguro.
  - Validação estrita do endpoint submetido pelo navegador (`push-validator.util.ts`), rejeitando IPs privados, endereços de loopback e metadados de nuvem para proteção absoluta contra Server-Side Request Forgery.
  - Desativação automática de subscrições expiradas ou canceladas (HTTP 404/410 Gone).

---

### 11. Privacidade, Preferências e Configurações de Perfil
- **Gerenciamento Unificado de Configurações (`/settings`):**
  - Aba de **Perfil:** Atualização de nome, biografia, telefone de contato e foto de avatar com upload validado.
  - Aba de **Segurança:** Gestão completa de 2FA, exibição e regeneração de códigos de emergência, troca segura de senha autenticada e alteração de e-mail de acesso.
  - Aba de **Preferências e Privacidade:**
    - Controle de visibilidade do telefone no perfil público (`showPhone`).
    - Opção de ocultar atividades no feed comunitário (`hideFromFeed`).
    - Habilitação granular de canais de notificação: e-mails de reserva, lembretes, alertas de segurança e notificações push.
    - Gerenciamento de dispositivos inscritos no Web Push com envio de notificação de teste imediata.

---

## 🔌 Contratos e Endpoints da API REST

Todas as requisições autenticadas requerem o header `Authorization: Bearer <token_jwt>`.

### 🔑 Autenticação e Segurança (`/auth`)
| Método | Endpoint | Descrição | Acesso |
|---|---|---|---|
| `POST` | `/auth/register` | Cadastra um novo usuário com papel `USER` e envia email de confirmação | Público |
| `POST` | `/auth/login` | Autentica com email e senha (retorna JWT ou desafio de 2FA se ativo) | Público |
| `GET` | `/auth/me` | Retorna o payload decodificado do token atual | Autenticado |
| `POST` | `/auth/verify-email` | Confirma o endereço de email através do token recebido | Público |
| `POST` | `/auth/resend-verification` | Reenvia o email com link/código de confirmação | Público |
| `POST` | `/auth/login/verify-code` | Valida o código 2FA (ou código de recuperação) e emite o token JWT | Público |
| `POST` | `/auth/login/resend-code` | Reenvia um novo código OTP de 2FA para o login em andamento | Público |
| `POST` | `/auth/password/forgot` | Solicita recuperação de senha (resposta genérica anti-enumeração) | Público |
| `POST` | `/auth/password/reset` | Redefine a senha via token com consumo atômico e invalidação de sessões | Público |
| `GET` | `/auth/security` | Consulta o status de 2FA e segurança da conta | Autenticado |
| `POST` | `/auth/2fa/enable/init` | Inicia ativação de 2FA enviando código OTP por email | Autenticado |
| `POST` | `/auth/2fa/enable/confirm` | Confirma código OTP, ativa 2FA e gera 8 códigos de recuperação | Autenticado |
| `POST` | `/auth/2fa/disable/init` | Inicia desativação de 2FA enviando código OTP por email | Autenticado |
| `POST` | `/auth/2fa/disable/confirm` | Confirma código OTP e desativa a autenticação em 2 etapas | Autenticado |
| `POST` | `/auth/2fa/recovery/regenerate/init` | Inicia regeneração de recovery codes com envio de OTP | Autenticado |
| `POST` | `/auth/2fa/recovery/regenerate/confirm` | Confirma código OTP e gera 8 novos códigos de recuperação | Autenticado |
| `POST` | `/auth/change-email` | Inicia alteração de email e envia confirmação para o novo endereço | Autenticado |
| `POST` | `/auth/change-email/confirm` | Conclui a alteração do email via token criptográfico | Autenticado |
| `POST` | `/auth/password/change/init` | Valida senha atual e inicia alteração de senha autenticada | Autenticado |
| `POST` | `/auth/password/change/confirm` | Confirma nova senha (com validação 2FA se ativo) e invalida sessões | Autenticado |

### 🏢 Espaços (`/spaces`)
| Método | Endpoint | Descrição | Acesso |
|---|---|---|---|
| `GET` | `/spaces?activeOnly=true&q=termo` | Lista espaços do catálogo público com busca | Público |
| `GET` | `/spaces/mine` | Lista os espaços cadastrados pelo usuário autenticado | Anfitrião (Verificado) |
| `GET` | `/spaces/:id` | Retorna os detalhes completos de um espaço específico | Público / Autenticado |
| `POST` | `/spaces` | Cria um novo espaço | Autenticado (Verificado) |
| `PATCH` | `/spaces/:id` | Atualiza informações de um espaço próprio | Dono / ADMIN |
| `DELETE` | `/spaces/:id` | Realiza soft delete de um espaço | Dono / ADMIN |

### 📅 Reservas (`/bookings`)
| Método | Endpoint | Descrição | Acesso |
|---|---|---|---|
| `POST` | `/bookings` | Solicita uma nova reserva de espaço | Autenticado (Verificado) |
| `GET` | `/bookings/my-bookings` | Lista as reservas feitas pelo usuário como cliente | Cliente (Verificado) |
| `GET` | `/bookings/host` | Lista as reservas recebidas nos espaços do usuário | Anfitrião (Verificado) |
| `GET` | `/bookings?type=client\|host` | Listagem geral (todas as reservas se ADMIN) | Autenticado (Verificado) |
| `GET` | `/bookings/space/:spaceId?date=YYYY-MM-DD` | Consulta disponibilidade e slots ocupados | Autenticado (Verificado) |
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
| `GET` | `/profiles/me` | Retorna os dados cadastrais do próprio perfil | Autenticado |
| `PATCH` | `/profiles/me` | Atualiza dados do próprio perfil (nome, bio, avatar, telefone) | Autenticado |
| `GET` | `/profiles/me/preferences` | Consulta preferências de privacidade e notificações | Autenticado |
| `PATCH` | `/profiles/me/preferences` | Atualiza preferências de privacidade e notificações | Autenticado |
| `GET` | `/profiles/:id` | Retorna o perfil de um usuário (respeitando privacidade do telefone) | Autenticado |
| `PATCH` | `/profiles/:id` | Atualiza dados cadastrais e papel (`USER` / `ADMIN`) | Apenas ADMIN |
| `DELETE` | `/profiles/:id` | Bane/desativa um usuário (Soft Delete com bloqueio de login) | Apenas ADMIN |
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

### 🔔 Notificações & Web Push (`/notifications`)
| Método | Endpoint | Descrição | Acesso |
|---|---|---|---|
| `GET` | `/notifications` | Lista notificações in-app paginadas e total não lido | Autenticado |
| `PATCH` | `/notifications/:id/read` | Marca notificação específica como lida | Próprio |
| `PATCH` | `/notifications/read-all` | Marca todas as notificações do usuário como lidas | Próprio |
| `GET` | `/notifications/push/public-key` | Retorna a chave pública VAPID para registro no navegador | Autenticado |
| `GET` | `/notifications/push/subscriptions` | Lista dispositivos com push ativo do usuário (sem segredos) | Próprio |
| `POST` | `/notifications/push/subscribe` | Cadastra ou reativa assinatura Web Push deste dispositivo | Próprio |
| `POST` | `/notifications/push/unsubscribe` | Cancela a assinatura push do dispositivo atual | Próprio |
| `POST` | `/notifications/push/test` | Envia notificação push de teste para validação imediata | Próprio |

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

# URLs de Ambiente e CORS
FRONTEND_URL="http://localhost:8080"
VITE_API_URL="http://localhost:3000"

# Conexão MySQL (Prisma ORM)
DATABASE_URL="mysql://root:sua_senha@localhost:3306/agendaspace"

# Conexão MongoDB (Mongoose)
MONGODB_URI="mongodb://localhost:27017/agendaspace"

# Autenticação JWT
JWT_SECRET="agendaspace_super_secret_jwt_key_minimo_32_caracteres"

# Credenciais do Administrador Inicial (Seed)
ADMIN_EMAIL="admin@agendaspace.local"
ADMIN_PASSWORD="Admin@123456"
ADMIN_FULL_NAME="Administrador Geral"

# Infraestrutura de Email (SMTP + Outbox Worker)
# Compatível com Brevo (smtp-relay.brevo.com:587), Mailtrap ou SMTP local
MAIL_HOST="smtp-relay.brevo.com"
MAIL_PORT="587"
MAIL_SECURE="false"
MAIL_USER="seu_usuario_smtp"
MAIL_PASS="sua_senha_smtp"
MAIL_FROM="AgendaSpace <noreply@agendaspace.local>"
MAIL_ENCRYPTION_KEY="uma_chave_secreta_super_segura_de_32_bytes_min"

# Web Push Notifications (RFC 8030 / VAPID)
# Gere com: node -e "const wp = require('web-push'); console.log(wp.generateVAPIDKeys());"
VAPID_PUBLIC_KEY="sua_chave_publica_vapid_base64url"
VAPID_PRIVATE_KEY="sua_chave_privada_vapid_base64url"
VAPID_SUBJECT="mailto:contato@agendaspace.local"
VITE_VAPID_PUBLIC_KEY="sua_chave_publica_vapid_base64url"
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
│   ├── auth/                 # Módulo de Autenticação JWT, 2FA, Recuperação de Senha e Guards
│   │   ├── decorators/       # @CurrentUser, @Roles
│   │   ├── guards/           # JwtAuthGuard, RolesGuard, VerifiedGuard, OptionalJwtAuthGuard
│   │   ├── strategies/       # JwtStrategy (com verificação dinâmica de authVersion)
│   │   └── dto/              # LoginDto, RegisterDto, 2faDto, PasswordDto, VerifyEmailDto
│   ├── bookings/             # Módulo de Reservas, Concorrência ACID e Pagamentos
│   ├── dashboard/            # Endpoints de Métricas, Estatísticas e Relatórios
│   ├── feed/                 # Módulo de Feed Comunitário (MongoDB / Mongoose)
│   │   └── schemas/          # Schemas Mongoose (Post, Comment, Like, Report, HiddenPost)
│   ├── mail/                 # Módulo de Email (Outbox Worker, Templates HTML e Criptografia)
│   │   ├── mail.service.ts   # Enfileiramento com idempotência (queueEmail)
│   │   ├── mail.worker.ts    # Worker assíncrono com lease atômico e retries
│   │   ├── mail.templates.ts # Templates responsivos com escape estrito
│   │   └── crypto.util.ts    # Criptografia simétrica com chave AES
│   ├── notifications/        # Módulo de Notificações In-App e Web Push
│   │   ├── notifications.controller.ts # Endpoints REST de avisos in-app
│   │   ├── push.service.ts   # Gestão de inscrições e despacho VAPID
│   │   ├── push.worker.ts    # Worker de envio push via outbox
│   │   └── push-validator.util.ts # Proteção contra SSRF e validação de URLs
│   ├── spaces/               # Módulo de Espaços e Comodidades
│   ├── upload/               # Serviço e Controller de Upload de Imagens com Multer
│   ├── users/                # Módulo de Perfis, Soft Delete, Banimento e Preferências
│   ├── prisma/               # PrismaService global compartilhado
│   ├── components/           # Componentes de UI em React
│   │   ├── auth/             # LoginForm (com 2FA e recuperação), RegisterForm, ProtectedRoute
│   │   ├── bookings/         # BookingDetailsDialog, formulários de reserva
│   │   ├── feed/             # NewPostInput com Câmera ao Vivo, PostCard, Comentários
│   │   ├── notifications/    # NotificationsBell com contador e dropdown interativo
│   │   ├── spaces/           # SpaceCard, SpaceImage com Fallback, Filtros
│   │   └── ui/               # Componentes primitivos do shadcn/ui
│   ├── contexts/             # AuthContext (sessão, tokens, logout limpo com unsubscribe push)
│   ├── hooks/                # Hooks customizados (useFileUpload, useToast, etc.)
│   ├── lib/                  # Clientes de API tipados (auth, bookings, feed, push, notifications)
│   ├── pages/                # Páginas da aplicação
│   │   ├── admin/            # Telas do Administrador (Spaces, Bookings, Users, Reports)
│   │   ├── host/             # Telas do Anfitrião (MySpaces, ReceivedBookings)
│   │   ├── user/             # Telas do Cliente (Spaces, MyBookings)
│   │   ├── CheckEmail.tsx    # Tela pós-cadastro para confirmação de e-mail
│   │   ├── VerifyEmail.tsx   # Validação de token de confirmação de e-mail
│   │   ├── ForgotPassword.tsx# Solicitação pública de recuperação de senha
│   │   ├── ResetPassword.tsx # Redefinição atômica de senha com validação
│   │   ├── Notifications.tsx # Central completa de notificações in-app
│   │   ├── Settings.tsx      # Configurações de Perfil, 2FA, Troca de Senha e Privacidade
│   │   ├── Feed.tsx          # Feed Social da comunidade
│   │   └── Dashboard.tsx     # Dashboard unificado (cliente/anfitrião/admin)
│   ├── App.tsx               # Roteamento global, guards de rota e TanStack Query
│   └── main.tsx              # Ponto de entrada do Frontend com registro do SW
├── prisma/
│   ├── schema.prisma         # Modelagem relacional do MySQL (Users, Outbox, Challenges, etc.)
│   ├── migrations/           # Histórico de migrações versionadas
│   └── seed.ts               # Script de povoamento inicial do ADMIN
├── public/
│   ├── logo.svg              # Identidade visual da AgendaSpace
│   ├── manifest.webmanifest  # Manifesto PWA para instalação standalone
│   ├── sw.js                 # Service Worker para captura e exibição de Web Push
│   └── uploads/              # Armazenamento local de mídias (spaces, avatars, feed)
├── test/                     # Testes automatizados (validação de recuperação de senha, etc.)
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
4. **Recuperação de Senha Segura e Imunidade a Concorrência:**
   - Tokens criptográficos de alta entropia (32 bytes) com digest SHA-256 no banco e validade de 30 minutos.
   - Consumo atômico condicional via `tx.authChallenge.updateMany({ where: { tokenDigest, consumedAt: null } })` que garante imunidade contra resgates concorrentes (race condition mitigada em 100%).
   - Respostas anti-enumeração genéricas e indistinguíveis para prevenir detecção de contas cadastradas.
   - Incremento atômico de `authVersion` no usuário, invalidando instantaneamente qualquer token JWT emitido previamente.
   - Preservação estrita de integridade (`role`, `emailVerifiedAt`, `isDeleted`, `isTwoFactorEnabled`).
   - Proibição de auto-login após redefinição, forçando nova autenticação que respeita o fluxo de 2FA se habilitado.
5. **Autenticação em Dois Fatores (2FA por E-mail):**
   - Interceptação de login com retorno de `requires2fa: true` e emissão de código OTP temporário de 6 dígitos.
   - Emissão de 8 códigos de recuperação de uso único (digests SHA-256) gerados na ativação do 2FA, permitindo resgate em caso de perda de acesso ao e-mail.
6. **Verificação Obrigatória de E-mail (`VerifiedGuard`):**
   - Operações críticas (publicação de anúncios, solicitação e gestão de reservas) são protegidas por guard que exige `emailVerifiedAt` preenchido.
7. **Padrão Transacional Outbox para E-mails:**
   - Desacoplamento entre chamadas de API e envios SMTP via tabela `email_outbox`.
   - Processamento em segundo plano com lease atômico (`locked_until`), limite de 3 tentativas com backoff progressivo e sanitização de HTML (`escapeHtml`).

### Notas Acadêmicas
- **Pagamentos Simulados:** As modalidades PIX e Cartão de Crédito funcionam como simulações para fins acadêmicos e de validação de fluxo — **nenhum dado bancário real é processado ou faturado**.
- **Upload Local:** Os arquivos são persistidos no diretório `public/uploads/` do servidor da aplicação. Em ambientes de produção corporativos, recomenda-se a substituição pelo envio direto a buckets S3/GCS.
- **Transações Não-Distribuídas:** O feed (MongoDB) e as entidades relacionais (MySQL) operam de forma assíncrona; exclusões de postagens realizam a limpeza de suas dependências NoSQL via rotinas dedicadas no serviço.

### 🔔 Notificações Web Push, VAPID e Requisitos de Ambiente
1. **Push API e VAPID Sem Fornecedor Pago:**
   - O AgendaSpace utiliza a especificação aberta **Web Push Protocol (RFC 8030 / RFC 8291)** com chaves VAPID geradas localmente via biblioteca open-source `web-push`.
   - **Sem custos ou lock-in:** Não impõe fornecedores de push pagos ou serviços proprietários de terceiros (como OneSignal ou Firebase Cloud Messaging com SDKs pagos).
   - Somente a chave pública (`VAPID_PUBLIC_KEY`) é exposta ao frontend; a chave privada (`VAPID_PRIVATE_KEY`) reside estritamente nas variáveis de ambiente do backend NestJS.
2. **Requisito de HTTPS no Ambiente Publicado:**
   - Em conformidade com as diretrizes do W3C e navegadores modernos, a **Push API e Service Workers exigem HTTPS obrigatório** em ambientes publicados/produção.
   - Em desenvolvimento local, navegadores permitem execução sobre `http://localhost` e `http://127.0.0.1`.
3. **Compatibilidade e Suporte de Navegadores:**
   - **Desktop:** Suportado nativamente no Google Chrome, Microsoft Edge, Mozilla Firefox e Apple Safari 16+ (macOS Ventura ou superior).
   - **Mobile Android:** Suportado nativamente no Chrome e Firefox para Android.
   - **Mobile iOS:** Suportado a partir do iOS / iPadOS 16.4+, **exclusivamente quando o usuário adiciona o site à Tela de Início** (modo PWA standalone, suportado pelo `manifest.webmanifest`).
   - **Navegação Anônima / Modos Restritos:** A maioria dos navegadores bloqueia intencionalmente o registro de Service Workers ou geração de chaves Push em abas anônimas para preservar a privacidade do usuário.
4. **Execução em Segundo Plano vs. Sistema Operacional:**
   - Em navegadores suportados com permissão concedida, os alertas chegam com a aba do aplicativo fechada.
   - A entrega em segundo plano depende de o sistema operacional e o navegador não encerrarem processos de background (ex: modos de economia de bateria agressiva do Android ou fechamento forçado no iOS suprimem tarefas de segundo plano).
5. **Prevenção de SSRF (Server-Side Request Forgery):**
   - O backend valida rigorosamente os endpoints de push submetidos pelo cliente (`push-validator.util.ts`), rejeitando protocolos que não sejam `https:`, portas não padrão, endereços de loopback (`localhost`, `127.0.0.1`), endereços IP de redes privadas (`10.0.0.0/8`, `192.168.0.0/16`, `172.16.0.0/12`), faixas de metadados de nuvem (`169.254.169.254`) e domínios internos (`.local`, `.internal`).
6. **Isolamento de Contas e Limpeza no Logout:**
   - Ao executar `signOut` no `AuthContext`, a aplicação desvincula a assinatura no backend e invoca `sub.unsubscribe()` localmente no navegador, impedindo que um novo usuário que faça login no mesmo navegador receba mensagens da conta anterior.
   - Ao desativar o push nas Configurações de um dispositivo, apenas a assinatura daquele dispositivo específico é excluída; outros dispositivos do usuário continuam ativos.
   - Ao desativar a preferência global de push na conta, o worker suprime todos os envios de push da conta sem excluir as inscrições de hardware.
7. **Fila Persistente (Push Outbox) e Tratamento de Erros 404/410:**
   - Os envios são enfileirados no MySQL (`push_outbox`) com bloqueio atômico de lease (`locked_until`), revalidação de preferências e retries com backoff exponencial.
   - Quando um gateway de push responde com HTTP 404 ou 410 (Gone), a assinatura é imediatamente desativada/removida no banco sem afetar as notificações in-app nem os outros dispositivos cadastrados.

---

## 👨‍💻 Autores

Projeto desenvolvido e mantido por:

- **Gabriel** — [@gabriel-wav](https://github.com/gabriel-wav)
- **Danilo** — [@danilinhotj187](https://github.com/danilinhotj187)
- **Antonio** — [@Antoniojferreira3](https://github.com/Antoniojferreira3)
- **Pedro H.** — [@pedroH901](https://github.com/pedroH901)
- **Pedro M.** — [@PedroMAnjos](https://github.com/PedroMAnjos)
- **Guilherme** — [@guilhermepereiraza90-creator](https://github.com/guilhermepereiraza90-creator)
