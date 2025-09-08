import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

// Um tipo simplificado para a prop de reserva
interface Booking {
  id: string;
  total_price: number;
}

interface PaymentDialogProps {
  booking: Booking;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PaymentDialog({ booking, onSuccess, onCancel }: PaymentDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handlePaymentAndConfirmation = async () => {
    setLoading(true);
    try {
      // Em uma aplicação real, aqui você processaria o pagamento com um gateway.
      // Para esta demonstração, vamos simular um pagamento bem-sucedido.

      // Após o pagamento, o status da reserva é atualizado para 'confirmed'.
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', booking.id);

      if (error) throw error;

      toast({
        title: "Reserva Confirmada!",
        description: "Seu pagamento foi processado e a reserva está confirmada."
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro na confirmação",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>Confirmar Reserva e Pagamento</DialogTitle>
        <DialogDescription>
          Realize o pagamento de R$ {booking.total_price.toFixed(2)} para confirmar sua reserva.
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
        {/* Área do Contrato */}
        <div className="space-y-2">
          <Label>Contrato de Locação do Espaço</Label>
          <ScrollArea className="h-80 w-full rounded-md border p-4">
            <h3 className="font-bold text-center mb-4">Área do Contrato</h3>
            <p className="text-sm text-muted-foreground">
              Este é um espaço reservado para o contrato de aluguel do espaço. 
              Ao clicar em "Pagar e Confirmar Reserva", você declara que leu e concorda com todos os termos e condições descritos neste documento.
              <br /><br />
              <strong>Cláusula 1: Objeto do Contrato</strong>
              <br />
              O presente contrato tem por objeto a locação temporária do espaço [Nome do Espaço], para uso exclusivo do locatário, nas datas e horários especificados na reserva.
              <br /><br />
              <strong>Cláusula 2: Pagamento</strong>
              <br />
              O pagamento do valor total da reserva deve ser efetuado antecipadamente para a confirmação da mesma. O não pagamento implicará no cancelamento automático da solicitação.
              <br /><br />
              <strong>Cláusula 3: Cancelamento</strong>
              <br />
              Cancelamentos realizados com mais de 48 horas de antecedência terão reembolso integral. Cancelamentos com menos de 48 horas não serão reembolsados.
            </p>
          </ScrollArea>
        </div>

        {/* Formulário de Pagamento Fictício */}
        <div className="space-y-4">
          <Label>Informações de Pagamento</Label>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Número do Cartão</Label>
                <Input id="cardNumber" placeholder="0000 0000 0000 0000" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Validade</Label>
                  <Input id="expiryDate" placeholder="MM/AA" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvc">CVC</Label>
                  <Input id="cvc" placeholder="123" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cardName">Nome no Cartão</Label>
                <Input id="cardName" placeholder="Seu Nome Completo" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Voltar</Button>
        <Button onClick={handlePaymentAndConfirmation} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Pagar e Confirmar Reserva
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}