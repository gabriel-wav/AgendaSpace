import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { payBooking, fetchBookingById } from '@/lib/bookings.api';
import { useToast } from '@/hooks/use-toast';
import { Loader2, QrCode, CreditCard, CheckCircle2 } from 'lucide-react';
import { formatBRL } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Um tipo simplificado para a prop de reserva
export interface PaymentBooking {
  id: string;
  totalPrice: number | string;
  startDatetime: string;
  endDatetime: string;
  space?: { name: string };
  user?: { fullName: string };
  spaces?: { name: string }; // For compatibility
}

interface PaymentFormProps {
  booking: PaymentBooking;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PaymentForm({ booking, onSuccess, onCancel }: PaymentFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD'>('PIX');
  const [contractAccepted, setContractAccepted] = useState(false);
  const [idempotencyKey] = useState(() => `idemp_${Date.now()}_${Math.random().toString(36).substring(7)}`);

  // Mock form state
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardName, setCardName] = useState('');

  const contractVersion = '1.0';
  const startFmt = format(new Date(booking.startDatetime), "dd/MM/yyyy HH:mm");
  const endFmt = format(new Date(booking.endDatetime), "dd/MM/yyyy HH:mm");
  const spaceName = booking.space?.name || 'Espaço Selecionado';
  const userName = booking.user?.fullName || 'Locatário';
  const totalFmt = formatBRL(booking.totalPrice);

  const contractText = `Contrato Acadêmico de Locação - v${contractVersion}
Partes: AgendaSpace e ${userName}
Objeto: Locação do espaço "${spaceName}".
Período: Início em ${startFmt} e término em ${endFmt}.
Valor: O locatário compromete-se a pagar o valor total de ${totalFmt}.
Cláusula Única: Este é um contrato fictício de uso acadêmico. Nenhum serviço real será prestado ou cobrado.`;

  const handlePaymentAndConfirmation = async () => {
    if (!contractAccepted) {
      toast({ title: "Aceite necessário", description: "Você deve aceitar o contrato de locação.", variant: "destructive" });
      return;
    }

    if (paymentMethod === 'CREDIT_CARD') {
      if (!cardNumber || !expiry || !cvc || !cardName) {
        toast({ title: "Campos obrigatórios", description: "Preencha os dados fictícios do cartão.", variant: "destructive" });
        return;
      }
    }

    setLoading(true);
    try {
      await payBooking(booking.id, {
        method: paymentMethod,
        idempotencyKey,
        contractVersion,
        contractAcceptedText: contractText,
      });

      toast({
        title: "Pagamento Simulado Aprovado!",
        description: "Sua reserva foi confirmada com sucesso."
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro na confirmação",
        description: error.response?.data?.message || error.message || "Falha ao processar simulação",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="mb-4">
        <h2 className="text-2xl font-semibold leading-none tracking-tight">Confirmar Reserva e Pagamento</h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          Ambiente de simulação acadêmica. Nenhum valor real será cobrado.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 py-2">
        {/* Área do Contrato */}
        <div className="lg:col-span-2 space-y-3">
          <Label className="text-base font-semibold">Resumo e Contrato de Locação</Label>
          <ScrollArea className="h-64 w-full rounded-md border p-4 bg-muted/30">
            <h3 className="font-bold text-center mb-4 text-sm">TERMO DE LOCAÇÃO ACADÊMICO V{contractVersion}</h3>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {contractText}
            </p>
          </ScrollArea>
          
          <div className="flex items-center space-x-2 pt-2">
            <input 
              type="checkbox" 
              id="terms" 
              checked={contractAccepted}
              onChange={(e) => setContractAccepted(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" 
            />
            <label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Li e aceito os termos do contrato fictício
            </label>
          </div>
        </div>

        {/* Formulário de Pagamento Fictício */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center justify-between">
            <span className="font-semibold text-foreground">Total a pagar:</span>
            <span className="text-xl font-bold text-primary">{totalFmt}</span>
          </div>

          <Tabs defaultValue="PIX" onValueChange={(v) => setPaymentMethod(v as 'PIX' | 'CREDIT_CARD')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="PIX" className="flex items-center gap-2"><QrCode className="h-4 w-4"/> PIX Simulado</TabsTrigger>
              <TabsTrigger value="CREDIT_CARD" className="flex items-center gap-2"><CreditCard className="h-4 w-4"/> Cartão Simulado</TabsTrigger>
            </TabsList>
            
            <TabsContent value="PIX" className="mt-4">
              <Card>
                <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
                  <div className="bg-muted p-4 rounded-xl">
                    <QrCode className="h-32 w-32 text-muted-foreground opacity-50" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Escaneie o QR Code ou copie o código</p>
                    <p className="text-xs text-muted-foreground break-all bg-muted p-2 rounded border font-mono">
                      00020101021126580014br.gov.bcb.pix0136SIMULACAO-ACADEMICA-NAO-COBRAR
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="CREDIT_CARD" className="mt-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="bg-amber-100/50 text-amber-800 text-xs p-3 rounded flex items-center gap-2 border border-amber-200">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Utilize dados fictícios. A validação é apenas estrutural.
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Número do Cartão Fictício</Label>
                    <Input id="cardNumber" placeholder="0000 0000 0000 0000" value={cardNumber} onChange={e => setCardNumber(e.target.value)} maxLength={19} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiryDate">Validade</Label>
                      <Input id="expiryDate" placeholder="12/30" value={expiry} onChange={e => setExpiry(e.target.value)} maxLength={5} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvc">CVC</Label>
                      <Input id="cvc" placeholder="123" value={cvc} onChange={e => setCvc(e.target.value)} maxLength={4} type="password" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cardName">Nome no Cartão</Label>
                    <Input id="cardName" placeholder="NOME FICTICIO DA SILVA" value={cardName} onChange={e => setCardName(e.target.value)} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-between items-center border-t pt-4 gap-2">
        <Button variant="ghost" onClick={onCancel} className="w-full sm:w-auto">Cancelar Simulação</Button>
        <Button onClick={handlePaymentAndConfirmation} disabled={loading || !contractAccepted} className="w-full sm:w-auto font-bold min-w-[200px]">
          {loading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</>
          ) : (
            'Simular Pagamento e Confirmar'
          )}
        </Button>
      </div>
    </div>
  );
}

export function PaymentDialog({ booking, onSuccess, onCancel }: PaymentFormProps) {
  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <PaymentForm booking={booking} onSuccess={onSuccess} onCancel={onCancel} />
    </DialogContent>
  );
}