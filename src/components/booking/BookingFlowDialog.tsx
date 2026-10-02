import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { BookingForm, BookingSpace } from './BookingForm';
import { PaymentForm } from './PaymentDialog';
import { Booking } from '@/lib/bookings.api';
import { Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BookingFlowDialogProps {
  space: BookingSpace | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}

export function BookingFlowDialog({ space, open, onOpenChange, onCompleted }: BookingFlowDialogProps) {
  const [step, setStep] = useState<'FORM' | 'PAYMENT'>('FORM');
  const [booking, setBooking] = useState<Booking | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setStep('FORM');
      setBooking(null);
    }
  }, [open]);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      if (booking && step === 'PAYMENT') {
        toast({
          title: 'Reserva salva como pendente',
          description: 'Sua solicitação foi salva. Você pode realizar o pagamento mais tarde na aba "Minhas Reservas".'
        });
        onCompleted();
      }
    }
    onOpenChange(isOpen);
  };

  if (!space) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={step === 'FORM' ? "w-[95vw] sm:max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-xl" : "max-w-4xl max-h-[90vh] overflow-y-auto"}>
        {step === 'FORM' ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Reservar {space.name}
              </DialogTitle>
              <DialogDescription>
                Escolha a data e o período desejado para solicitar a sua reserva.
              </DialogDescription>
            </DialogHeader>
            <BookingForm
              space={space}
              onSuccess={(createdBooking, action) => {
                setBooking(createdBooking);
                if (action === 'PAY_NOW') {
                  setStep('PAYMENT');
                } else {
                  onCompleted();
                  onOpenChange(false);
                }
              }}
              onCancel={() => onOpenChange(false)}
            />
          </>
        ) : (
          booking && (
            <PaymentForm
              booking={booking}
              onSuccess={() => {
                onCompleted();
                onOpenChange(false);
              }}
              onCancel={() => {
                // Ao invés de fechar, avisa que ficou pendente
                toast({
                  title: 'Pagamento cancelado',
                  description: 'Sua reserva está pendente. Acesse "Minhas Reservas" para pagar depois.'
                });
                onCompleted();
                onOpenChange(false);
              }}
            />
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
