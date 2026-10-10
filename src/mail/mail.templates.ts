export function escapeHtml(unsafe: string | null | undefined): string {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const TEMPLATES = {
  EMAIL_CONFIRMATION: {
    subject: 'Confirme seu endereço de email',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0f172a;">Olá, ${escapeHtml(data.fullName)}!</h2>
        <p>Obrigado por se cadastrar no AgendaSpace. Para concluir seu cadastro, por favor, clique no botão abaixo para confirmar seu endereço de email.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${escapeHtml(data.tokenLink)}" style="background-color: #0f172a; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Confirmar Email</a>
        </div>
        <p>Ou acesse o link diretamente: <br><a href="${escapeHtml(data.tokenLink)}">${escapeHtml(data.tokenLink)}</a></p>
        <p>Se você não criou uma conta, pode ignorar este email de forma segura.</p>
      </div>
    `,
    text: (data: any) => `Olá, ${data.fullName}!\n\nPara confirmar seu email, acesse o link:\n${data.tokenLink}\n\nSe você não criou uma conta, ignore esta mensagem.`
  },
  EMAIL_CHANGE: {
    subject: 'Confirme a alteração de email',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0f172a;">Olá, ${escapeHtml(data.fullName)}!</h2>
        <p>Recebemos uma solicitação para alterar o email da sua conta. Se foi você, clique no link abaixo:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${escapeHtml(data.tokenLink)}" style="background-color: #2563eb; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Confirmar Novo Email</a>
        </div>
      </div>
    `,
    text: (data: any) => `Olá, ${data.fullName}!\n\nPara confirmar a alteração do seu email, acesse o link:\n${data.tokenLink}`
  },
  BOOKING_CONFIRMED: {
    subject: 'Reserva Confirmada',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #16a34a;">Sua reserva foi confirmada!</h2>
        <p>Olá, ${escapeHtml(data.fullName)}, sua reserva no espaço <strong>${escapeHtml(data.spaceName)}</strong> está confirmada.</p>
        <p>Data: ${escapeHtml(data.date)}<br>Total: R$ ${escapeHtml(String(data.price))}</p>
        <p>Obrigado por usar o AgendaSpace!</p>
      </div>
    `,
    text: (data: any) => `Reserva Confirmada!\n\nOlá, ${data.fullName}, sua reserva em ${data.spaceName} foi confirmada para ${data.date}. Total: R$ ${data.price}.`
  },
  SECURITY_ALERT: {
    subject: 'Aviso de Segurança - Nova Ação Realizada',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626;">Aviso de Segurança</h2>
        <p>Olá, ${escapeHtml(data.fullName)}.</p>
        <p>Uma nova ação foi detectada na sua conta: <strong>${escapeHtml(data.actionName)}</strong>.</p>
        <p>Data: ${escapeHtml(data.date)}<br>Endereço IP: ${escapeHtml(data.ipAddress)}</p>
        <p>Se você não reconhece esta atividade, altere sua senha imediatamente e entre em contato com o suporte.</p>
      </div>
    `,
    text: (data: any) => `Aviso de Segurança\n\nOlá, ${data.fullName}. Ação detectada: ${data.actionName} em ${data.date} (IP: ${data.ipAddress}). Se não foi você, proteja sua conta.`
  },
  '2FA_CODE': {
    subject: 'Seu código de segurança - AgendaSpace',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0f172a;">Código de Segurança</h2>
        <p>Finalidade: <strong>${escapeHtml(data.purpose)}</strong></p>
        <p>Seu código é:</p>
        <div style="text-align: center; margin: 30px 0; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #2563eb;">
          ${escapeHtml(data.code)}
        </div>
        <p>Este código expira em 5 minutos. Não o compartilhe com ninguém.</p>
      </div>
    `,
    text: (data: any) => `Seu código de segurança é: ${data.code}\n\nFinalidade: ${data.purpose}\nEste código expira em 5 minutos.`
  },
  BOOKING_REQUESTED: {
    subject: 'Nova Solicitação de Reserva',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Nova solicitação de reserva!</h2>
        <p>Olá, ${escapeHtml(data.fullName)}.</p>
        <p>Houve uma nova solicitação para o espaço <strong>${escapeHtml(data.spaceName)}</strong>.</p>
        <p>Data: ${escapeHtml(data.date)}<br>Total: R$ ${escapeHtml(String(data.price))}</p>
        <p>Por favor, acesse o painel para aprovar ou rejeitar.</p>
      </div>
    `,
    text: (data: any) => `Nova solicitação de reserva em ${data.spaceName} para ${data.date}. Acesse o painel para analisar.`
  },
  BOOKING_CANCELLED: {
    subject: 'Reserva Cancelada',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626;">Sua reserva foi cancelada</h2>
        <p>Olá, ${escapeHtml(data.fullName)}.</p>
        <p>A reserva no espaço <strong>${escapeHtml(data.spaceName)}</strong> para a data ${escapeHtml(data.date)} foi cancelada.</p>
        <p>Motivo: ${escapeHtml(data.reason)}</p>
      </div>
    `,
    text: (data: any) => `Sua reserva em ${data.spaceName} (${data.date}) foi cancelada. Motivo: ${data.reason}`
  },
  BOOKING_APPROVED: {
    subject: 'Reserva Aprovada - Aguardando Pagamento',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #16a34a;">Reserva Aprovada!</h2>
        <p>Olá, ${escapeHtml(data.fullName)}.</p>
        <p>Sua reserva no espaço <strong>${escapeHtml(data.spaceName)}</strong> para a data ${escapeHtml(data.date)} foi aprovada pelo anfitrião.</p>
        <p>Para confirmar sua reserva, realize o pagamento no valor de R$ ${escapeHtml(String(data.price))}.</p>
      </div>
    `,
    text: (data: any) => `Sua reserva em ${data.spaceName} (${data.date}) foi aprovada! Realize o pagamento de R$ ${data.price} para confirmar.`
  },
  BOOKING_REJECTED: {
    subject: 'Solicitação de Reserva Rejeitada',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626;">Reserva Rejeitada</h2>
        <p>Olá, ${escapeHtml(data.fullName)}.</p>
        <p>Infelizmente, sua solicitação de reserva no espaço <strong>${escapeHtml(data.spaceName)}</strong> para a data ${escapeHtml(data.date)} foi rejeitada pelo anfitrião.</p>
      </div>
    `,
    text: (data: any) => `Sua solicitação de reserva em ${data.spaceName} (${data.date}) foi rejeitada pelo anfitrião.`
  },
  BOOKING_REMINDER: {
    subject: 'Lembrete da sua reserva',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Lembrete de Reserva</h2>
        <p>Olá, ${escapeHtml(data.fullName)}.</p>
        <p>Lembramos que sua reserva no espaço <strong>${escapeHtml(data.spaceName)}</strong> começará em breve.</p>
        <p>Data de início: ${escapeHtml(data.date)}</p>
        <p>Desejamos um excelente evento!</p>
      </div>
    `,
    text: (data: any) => `Lembrete: sua reserva em ${data.spaceName} começará em breve (${data.date}).`
  },
  LOGIN_ALERT: {
    subject: 'Novo Login Detectado',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Novo Login Detectado</h2>
        <p>Olá, ${escapeHtml(data.fullName)}.</p>
        <p>Detectamos um novo login em sua conta do AgendaSpace.</p>
        <p>Data: ${escapeHtml(data.date)}<br>IP: ${escapeHtml(data.ipAddress)}</p>
        <p>Se foi você, não precisa fazer nada. Caso contrário, acesse suas configurações de segurança imediatamente.</p>
      </div>
    `,
    text: (data: any) => `Novo login detectado na sua conta. Data: ${data.date}, IP: ${data.ipAddress}.`
  }
};
