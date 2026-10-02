# Correções de Fluxo - Pagamento, Aprovação e Exclusão

### Atualização 3 - Exclusão vs Desativação de Espaços

Atendendo aos requisitos da etapa sobre a exclusão de anúncios:

1. **Adição do Marcador `deletedAt` e `isDeleted`**:
   - `isDeleted` já existia desde a estruturação de migração, porém foi implementado um `deletedAt` explícito no `schema.prisma`. O DELETE lógico (soft delete) persistente agora salva a flag de exclusão irreversível para separar do ato rotineiro de "pausar/desativar anúncio" (`isActive: false`).

2. **Segurança Atômica no Backend**:
   - Os métodos `update` e `remove` do backend (`spaces.service.ts`) operam de forma isolada travando a linha com `SELECT ... FOR UPDATE` e rejeitam completamente qualquer edição posterior (inclusive PATCH manual injetado `isActive: true`) quando o espaço conta com `is_deleted = 1` ou `deleted_at != null`.
   - **Prevenção de Corridas**: Em `bookings.service.ts`, as criações de novas reservas e pagamentos agora consultam bloqueando na raiz (spaces) o estado da exclusão lógica do espaço. Tentativas de pagamento ou aprovação para espaços permanentemente excluídos resultarão em estorno fictício/cancelamento.

3. **Reajuste da Tela de UI (MySpaces e Admin Spaces)**:
   - O Dialog modal (lixeira) agora traz textualmente a exclusão como uma via **irreversível**. Ele confirma a operação exibindo o nome exato do espaço em negrito (`{targetSpace?.name}`).
   - Uma vez deletado, o espaço agora SOME da interface das listas, ao invés de apenas ficar cinza/desativado de maneira visual, usando o método `setSpaces(prev => prev.filter(s => s.id !== deleteTarget))`.
   - Um bloqueador de Loading visual previne duplo clique e ações múltiplas em rede enquanto o comando REST está em execução. Em caso de sucesso da resposta (`200 OK`), o dialog some. Se houver falha, as mensagens de erro mostram exatamente os avisos do backend. 

### Atualização 4 - Fluxo Unificado de Reserva (BookingFlowDialog)

Atendendo aos requisitos de consolidar o fluxo de Reserva -> Pagamento num único contrato:

1. **Separação de Conteúdo e Invólucro**:
   - O componente `PaymentDialog` original incluía internamente as tags de formatação de janela modal (`<DialogContent>`). Esse conteúdo interno foi abstraído e exportado isoladamente como `PaymentForm`. O `<PaymentDialog>` antigo agora serve apenas como casca para o `<PaymentForm>` mantendo sua integridade.

2. **Criação do componente `BookingFlowDialog`**:
   - Desenvolvemos um componente independente em `src/components/booking/BookingFlowDialog.tsx` que encapsula as abas de formatação/solicitação (`FORM`) e a simulação de pagamento (`PAYMENT`) de modo intercambiável, gerenciando uma única janela baseada na tag root de `Dialog`.
   - Ao longo da transição de estapas:
      - Detalhes do período são preenchidos.
      - Ao clicar em "Pagar Agora", a reserva é criada por via REST e armazenada no estado interno (sem fechar a janela).
      - O componente automaticamente transita para `PAYMENT` com o mesmo `ID` de reserva recém instanciado, mantendo a integridade referencial. "Pagar Depois" avisa o sistema superior que o fluxo acabou em etapa prematura.
      - Se a janela fechar ao meio (no meio do step PAYMENT por click outside/cancelamento), um toast intercepta avisando: "Sua reserva está pendente. Acesse Minhas Reservas para pagar depois", impedindo perda silenciosa da solicitação do cliente.

3. **Substituição de Estado em Consumidores**:
   - `src/pages/user/Spaces.tsx` e `src/components/dashboard/UserDashboard.tsx` abandonaram as máquinas de estado locais complexas (que gerenciavam múltiplos booleanos para exibir formulário, pagar depois e modals conflitantes) trocando-os pelo novo e encapsulado `<BookingFlowDialog />`.
   - O retorno e callbacks acionam `fetchData()` em caso de sucesso da conversão de estado de pagamento.
