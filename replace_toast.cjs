const fs = require('fs');
let data = fs.readFileSync('src/pages/admin/Bookings.tsx', 'utf8');

const target = `                          onClick={() => {
                            toast({
                              title: "Detalhes da Reserva",
                              description: \`Reserva de \${booking.user?.fullName} para \${booking.space?.name} em \${format(new Date(booking.startDatetime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}\`
                            });
                          }}`;

const replacement = `                          onClick={() => {
                            let text = \`Reserva de \${booking.user?.fullName} para \${booking.space?.name} em \${format(new Date(booking.startDatetime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.\`;
                            if (booking.payment) text += \` Pagamento (\${booking.payment.method}) registrado.\`;
                            if (booking.contract) text += \` Contrato aceito (v\${booking.contract.version}).\`;
                            toast({
                              title: "Detalhes da Reserva",
                              description: text
                            });
                          }}`;

const newData = data.replace(target, replacement);
fs.writeFileSync('src/pages/admin/Bookings.tsx', newData, 'utf8');
console.log('Replacement successful:', newData !== data);
