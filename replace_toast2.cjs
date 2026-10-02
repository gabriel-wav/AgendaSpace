const fs = require('fs');
let data = fs.readFileSync('src/pages/admin/Bookings.tsx', 'utf8');
const lines = data.split('\n');

const newLines = [
  ...lines.slice(0, 318), // lines 0-317 (0-indexed)
  '                            let text = `Reserva de ${booking.user?.fullName} para ${booking.space?.name} em ${format(new Date(booking.startDatetime), "dd/MM/yyyy \\'às\\' HH:mm", { locale: ptBR })}.`;',
  '                            if (booking.payment) text += ` Pagamento (${booking.payment.method}) registrado.`;',
  '                            if (booking.contract) text += ` Contrato aceito (v${booking.contract.version}).`;',
  '                            toast({',
  '                              title: "Detalhes da Reserva",',
  '                              description: text',
  '                            });',
  ...lines.slice(323) // lines 324 onwards
];

fs.writeFileSync('src/pages/admin/Bookings.tsx', newLines.join('\n'), 'utf8');
console.log('Replacement done by lines.');
