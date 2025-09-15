# 🗓️ AgendaSpace

AgendaSpace é uma plataforma completa e intuitiva para a gestão inteligente de espaços compartilhados. O sistema permite que administradores gerenciem espaços, reservas e usuários, enquanto os usuários podem facilmente encontrar, reservar e gerenciar seus agendamentos.

**🚀 Link Site Publicado:** [https://agenda-space.vercel.app/](https://agenda-space.vercel.app/)

**🎥 Vídeo Demonstração:** [https://drive.google.com/file/d/1hw5_MUbcGn4807LvWwtNBhWdivPVq272/view?usp=drive_link](https://drive.google.com/file/d/1hw5_MUbcGn4807LvWwtNBhWdivPVq272/view?usp=drive_link)

---

## ✨ Funcionalidades Implementadas

O projeto conta com dois painéis distintos, um para administradores e outro para usuários, cada um com suas funcionalidades específicas.

### 🛠️ Painel do Administrador

- **📊 Dashboard Geral:**  
  Visualização rápida de estatísticas chave, como total de espaços, reservas para o dia, receita mensal e número de usuários ativos.

- **🏢 Gestão de Espaços (CRUD):**  
  - Criação, visualização, edição e exclusão de espaços.  
  - Campos para nome, descrição, capacidade, preço por hora, recursos (ex: Wi-Fi, projetor) e status (ativo/inativo).  
  - Upload de imagens para os espaços.

- **📅 Gestão de Reservas:**  
  - Visualização de todas as reservas da plataforma.  
  - Filtros por status da reserva (pendente, confirmada, cancelada) e por data.  
  - Atualização do status das reservas (ex: confirmar uma reserva pendente, marcar como concluída).

- **👥 Gestão de Usuários:**  
  - Listagem de todos os usuários cadastrados no sistema.  
  - Visualização de informações como nome, email e data de cadastro.  
  - Gerenciamento de permissões, permitindo promover um usuário a administrador ou rebaixá-lo a usuário comum.

- **📈 Relatórios:**  
  Análise de dados com estatísticas sobre o total de reservas, receita, status das reservas e performance geral da plataforma.

### 🧑‍💻 Painel do Usuário

- **📋 Dashboard Pessoal:**  
  Resumo das próximas reservas do usuário e espaços disponíveis.

- **🔍 Exploração de Espaços:**  
  - Visualização de todos os espaços ativos com filtros por nome, capacidade, preço e recursos disponíveis.

- **💳 Sistema de Reservas:**  
  - Formulário completo para realizar uma reserva, selecionando data e horários disponíveis.  
  - Cálculo automático do preço total.

- **🗂️ Minhas Reservas:**  
  - Listagem das reservas do usuário, separadas por "Próximas", "Hoje" e "Histórico".  
  - Opção de cancelar reservas com antecedência.  
  - Funcionalidade de "pagamento" simulado para confirmar reservas pendentes.

- **⚙️ Gerenciamento de Perfil:**  
  Página de configurações para o usuário editar suas informações pessoais, como nome, email e foto de perfil.

### 🌐 Funcionalidades Gerais

- **🔑 Autenticação:** Sistema completo de login e cadastro de usuários, com perfis distintos para administradores e usuários comuns.  
- **🗄️ Banco de Dados e Backend:** Utilização do Supabase para autenticação, banco de dados (PostgreSQL) e armazenamento de arquivos.  
- **💻 Interface Moderna:** Construída com React, TypeScript, Tailwind CSS e shadcn/ui, garantindo uma experiência de usuário responsiva e agradável.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** Vite, React, TypeScript  
- **Estilização:** Tailwind CSS, shadcn/ui  
- **Backend e Banco de Dados:** Supabase (Auth, PostgreSQL, Storage)  
- **Roteamento:** React Router DOM  
- **Gerenciamento de Formulários:** React Hook Form com Zod para validação  
- **UI Components:** Lucide React para ícones  
- **Gerenciamento de Estado de Cache:** TanStack Query (React Query)  

---

## ⚡ Configuração e Execução do Projeto

Siga os passos abaixo para configurar e executar o projeto em seu ambiente local.

### 📌 Pré-requisitos

- Node.js (versão 18.x ou superior)  
- npm (geralmente instalado com o Node.js)  
- Uma conta no Supabase  

### 1️⃣ Clonar o Repositório

```bash
git clone <URL_DO_REPOSITÓRIO>
cd agenda-space
````

### 2️⃣ Instalar as Dependências

```bash
npm install
```

### 3️⃣ Configurar o Supabase

1. Crie um novo projeto no Supabase.
2. Vá para a seção **SQL Editor** do seu projeto.
3. Copie o conteúdo dos arquivos de migração da pasta `supabase/migrations` e execute-os no SQL Editor:

```
20250822225051_391e25be-72a8-4765-b3c1-262290de5e06.sql
20250822225120_6f70d5c0-80d0-40e9-b63a-07c17015a309.sql
20250829234402_fe1f7d12-b3fe-41ca-b57d-0297afaa1880.sql
20250908214415_6ca96adb-9353-4a96-947d-abfbb04778da.sql
20250908214442_3317fd3c-d043-486b-b4cc-1e4d8e0a00d0.sql
20250909220029_5fdd7ecd-0738-438c-a875-2bcdcad31cb9.sql
```

4. Vá para **Settings > API** no Supabase para obter a **URL do Projeto** e a **Chave Anônima Pública (public anon key)**.

### 4️⃣ Configurar as Variáveis de Ambiente

1. Na raiz do projeto, crie um arquivo chamado `.env`.
2. Copie o conteúdo do arquivo `.env` fornecido e cole no novo arquivo:

```env
VITE_SUPABASE_URL="SUA_URL_DO_PROJETO_SUPABASE"
VITE_SUPABASE_PUBLISHABLE_KEY="SUA_CHAVE_ANONIMA_PUBLICA_SUPABASE"
```

3. Substitua `SUA_URL_DO_PROJETO_SUPABASE` e `SUA_CHAVE_ANONIMA_PUBLICA_SUPABASE` pelos valores obtidos no passo anterior.

### 5️⃣ Executar o Projeto

```bash
npm run dev
```

O projeto estará disponível em `http://localhost:8080` (ou outra porta, se a 8080 estiver em uso).

---

## 👨‍💻 Autores

Este projeto foi desenvolvido e é mantido por:

* **Gabriel** - [GitHub: @gabriel-wav](https://github.com/gabriel-wav)
* **Danilo** - [GitHub: @danilinhotj187](https://github.com/danilinhotj187)
* **Antonio** - [GitHub: @Antoniojferreira3](https://github.com/Antoniojferreira3)
* **Pedro** - [GitHub: @pedroH901](https://github.com/pedroH901)



