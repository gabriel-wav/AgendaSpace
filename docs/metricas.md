# Métricas e Relatórios do AgendaSpace

Este documento define os critérios exatos para o cálculo de indicadores exibidos nos dashboards.

## Fusos Horários (Timezone)
- **Timezone Base**: `America/Sao_Paulo` (UTC-3).
- **Justificativa**: Todo cálculo de "Hoje" ou "Este mês" deve respeitar o fechamento diário e mensal do horário de Brasília, independentemente do servidor rodar em UTC.

## Indicadores - Visão ADMIN (Global)

1. **Total de Espaços**
   - **Descrição**: Total de locais disponíveis na plataforma.
   - **Cálculo**: `COUNT(Space)` onde `isActive = true`.

2. **Reservas Hoje**
   - **Descrição**: Volume de reservas acontecendo na data atual.
   - **Cálculo**: `COUNT(Booking)` onde `startDatetime` está entre `00:00:00` e `23:59:59` de "Hoje" (America/Sao_Paulo).
   - **Filtro**: Apenas status `CONFIRMED`. Ignora `PENDING`, `CANCELLED` e `COMPLETED`.

3. **Receita Mensal**
   - **Descrição**: Dinheiro real simulado retido no mês corrente.
   - **Cálculo**: `SUM(Payment.amount)`.
   - **Filtro**: Apenas pagamentos cujo `status = SUCCESS`, gerados entre o primeiro e o último milissegundo do mês corrente em SP. 
   - **Regra de Cancelamento**: Se a reserva correspondente for cancelada (`Booking.status = CANCELLED`), o pagamento associado é ignorado (simulando um estorno integral).
   - **Regra de Confirmação Manual**: Aprovações via status que burlaram a tela de pagamento não geram métrica de receita, garantindo que "Receita" meça apenas dinheiro transacionado via PIX/Cartão.

4. **Usuários Cadastrados (Anteriormente "Ativos")**
   - **Descrição**: Volume de contas criadas.
   - **Motivo da mudança**: A plataforma não registra log de sessões de usuário ativo (last_login), logo `Math.max(unique_users, 1)` foi substituído pela contagem real e honesta.
   - **Cálculo**: `COUNT(User)`.

## Indicadores - Visão Host (Anfitrião)
Seguem estritamente as mesmas regras do ADMIN, porém com um filtro obrigatório em todas as queries:
- `Booking.space.createdById = :hostId`
O anfitrião não vê métricas financeiras ou de volume geradas por espaços de concorrentes.

## Indicadores - Visão Cliente (User Dashboard)
1. **Próximas Reservas**
   - **Cálculo**: Contagem de reservas onde `startDatetime >= now()` e status é estritamente `CONFIRMED` (requer aprovação e pagamento).
2. **Tempo Total (Horas)**
   - **Cálculo**: Soma das horas (`endDatetime - startDatetime`) das reservas contempladas pelo indicador acima.
3. **Espaços Disponíveis**
   - **Cálculo**: O mesmo número global `COUNT(Space) onde isActive = true E is_deleted = false`.
