import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog } from '@/components/ui/dialog';
import { Calendar, Clock, MapPin, Eye, X, Plus, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, isPast, isToday, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PaymentDialog } from '@/components/booking/PaymentDialog';
import { BookingDetailsDialog } from '@/components/booking/BookingDetailsDialog';
import {
  fetchMyBookings as apiFetchBookings,
  updateBookingStatus,
  Booking,
} from '@/lib/bookings.api';
import { formatBRL } from '@/lib/utils';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status.toLowerCase()) {
    case 'confirmed':  return 'default';
    case 'pending':    return 'secondary';
    case 'completed':  return 'outline';
    case 'cancelled':  return 'destructive';
    default:           return 'secondary';
  }
}

function getStatusLabel(status: string): string {
  switch (status.toLowerCase()) {
    case 'confirmed':  return 'Confirmada';
    case 'pending':    return 'Pendente';
    case 'completed':  return 'Concluída';
    case 'cancelled':  return 'Cancelada';
    default:           return status;
  }
}

/** Inline sub-label for PENDING bookings showing what is still missing */
function pendingSubLabel(booking: Booking): string | null {
  if (booking.status.toUpperCase() !== 'PENDING') return null;
  const ap = (booking.approvalStatus || 'PENDING').toUpperCase();
  const paid = !!booking.payment && booking.payment.status === 'SUCCESS';
  if (ap === 'REJECTED') return 'Recusada pelo anfitrião';
  if (paid && ap !== 'APPROVED') return 'Paga · aguardando aprovação';
  if (!paid && ap === 'APPROVED') return 'Aprovada · aguardando pagamento';
  return 'Aguardando pagamento e aprovação';
}

/** True only when a payment action makes sense (not paid, not terminal state) */
function canPay(booking: Booking): boolean {
  const st = booking.status.toUpperCase();
  const ap = (booking.approvalStatus || 'PENDING').toUpperCase();
  const paid = !!booking.payment && booking.payment.status === 'SUCCESS';
  if (paid) return false;
  if (st !== 'PENDING') return false;
  if (ap === 'REJECTED') return false;
  return true;
}

function canCancel(booking: Booking): boolean {
  const hoursUntil =
    (new Date(booking.startDatetime).getTime() - Date.now()) / (1000 * 60 * 60);
  return (
    booking.status.toLowerCase() !== 'cancelled' &&
    booking.status.toLowerCase() !== 'completed' &&
    hoursUntil > 2
  );
}

// ─── BookingRow ───────────────────────────────────────────────────────────────

interface BookingRowProps {
  booking: Booking;
  onDetails: (b: Booking) => void;
  onPay: (b: Booking) => void;
  onCancel: (id: string) => void;
}

function BookingRow({ booking, onDetails, onPay, onCancel }: BookingRowProps) {
  const sub = pendingSubLabel(booking);

  return (
    <Card className="mb-3">
      <CardContent className="pt-5 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          {/* Left: space info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="font-medium text-foreground truncate">{booking.space?.name ?? '—'}</h3>
              <Badge variant={getStatusVariant(booking.status)}>
                {getStatusLabel(booking.status)}
              </Badge>
              {sub && (
                <span className="text-[10px] sm:text-xs font-medium text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-full border border-amber-200">
                  {sub}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{format(new Date(booking.startDatetime), 'dd/MM/yyyy', { locale: ptBR })}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>
                  {format(new Date(booking.startDatetime), 'HH:mm')}–
                  {format(new Date(booking.endDatetime), 'HH:mm')}
                </span>
              </div>
              {booking.space?.capacity && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{booking.space.capacity} pessoas</span>
                </div>
              )}
              <div className="font-medium text-foreground">
                {formatBRL(booking.totalPrice)}
              </div>
            </div>

            {/* Resources chips (truncated) */}
            {booking.space?.resources && booking.space.resources.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {booking.space.resources.slice(0, 4).map((r) => (
                  <Badge key={r} variant="outline" className="text-xs">{r}</Badge>
                ))}
                {booking.space.resources.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{booking.space.resources.length - 4}
                  </Badge>
                )}
              </div>
            )}

            {booking.notes && (
              <p className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-2 mt-2 line-clamp-1">
                {booking.notes}
              </p>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex sm:flex-col gap-2 flex-wrap sm:ml-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
            {/* Pay button — only when payment is actually needed */}
            {canPay(booking) && (
              <Button
                size="sm"
                onClick={() => onPay(booking)}
                className="flex-1 sm:flex-none"
              >
                <DollarSign className="mr-1.5 h-3.5 w-3.5" />
                Pagar
              </Button>
            )}

            {/* Details button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDetails(booking)}
              className="flex-1 sm:flex-none"
              aria-label={`Ver detalhes de ${booking.space?.name}`}
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              <span className="text-xs">Detalhes</span>
            </Button>

            {/* Cancel button */}
            {canCancel(booking) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCancel(booking.id)}
                className="text-destructive hover:text-destructive flex-1 sm:flex-none"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                <span>{booking.status.toLowerCase() === 'pending' ? 'Cancelar Pedido' : 'Cancelar'}</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Details modal state
  const [detailsBookingId, setDetailsBookingId] = useState<string | null>(null);
  const [detailsSeed, setDetailsSeed] = useState<Booking | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Payment modal state — only opened via the "Pagar" button
  const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) fetchBookings();
  }, [user]);

  const fetchBookings = useCallback(async () => {
    try {
      const data = await apiFetchBookings();
      setBookings(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar reservas',
        description: error.message || 'Não foi possível carregar as reservas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const openDetails = (booking: Booking) => {
    setDetailsSeed(booking);
    setDetailsBookingId(booking.id);
    setShowDetails(true);
  };

  const closeDetails = () => {
    setShowDetails(false);
  };

  const openPayment = (booking: Booking) => {
    setPaymentBooking(booking);
  };

  const cancelBooking = async (bookingId: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta reserva?')) return;
    try {
      await updateBookingStatus(bookingId, { status: 'CANCELLED' });
      toast({ title: 'Reserva cancelada', description: 'Sua reserva foi cancelada com sucesso.' });
      await fetchBookings();
    } catch (error: any) {
      toast({
        title: 'Erro ao cancelar reserva',
        description: error.message || 'Não foi possível cancelar.',
        variant: 'destructive',
      });
    }
  };

  const categorizeBookings = () => {
    const upcoming = bookings.filter(
      (b) =>
        isFuture(new Date(b.startDatetime)) &&
        !isToday(new Date(b.startDatetime)) &&
        ['pending', 'confirmed'].includes(b.status.toLowerCase())
    );
    const today = bookings.filter(
      (b) =>
        isToday(new Date(b.startDatetime)) &&
        ['pending', 'confirmed'].includes(b.status.toLowerCase())
    );
    const past = bookings.filter(
      (b) =>
        isPast(new Date(b.endDatetime)) ||
        ['completed', 'cancelled'].includes(b.status.toLowerCase())
    );
    return { upcoming, today, past };
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando suas reservas…</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const { upcoming, today, past } = categorizeBookings();

  const EmptyState = ({
    icon: Icon,
    title,
    message,
    showCTA,
  }: {
    icon: React.ElementType;
    title: string;
    message: string;
    showCTA?: boolean;
  }) => (
    <Card>
      <CardContent className="text-center py-12">
        <Icon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        <p className="text-muted-foreground mb-4">{message}</p>
        {showCTA && (
          <Button onClick={() => navigate('/spaces')}>Fazer Nova Reserva</Button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Minhas Reservas</h1>
            <p className="text-muted-foreground mt-1">Gerencie todas as suas reservas de espaços</p>
          </div>
          <Button onClick={() => navigate('/spaces')} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nova Reserva
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Hoje', value: today.length },
            { label: 'Próximas', value: upcoming.length },
            { label: 'Pendentes', value: bookings.filter((b) => b.status.toLowerCase() === 'pending').length },
            { label: 'Históricas', value: past.length },
          ].map(({ label, value }) => (
            <Card key={label}>
              <CardContent className="pt-5 pb-4">
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upcoming">Próximas ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="today">Hoje ({today.length})</TabsTrigger>
            <TabsTrigger value="past">Histórico ({past.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-2 mt-4">
            {upcoming.length > 0 ? (
              upcoming.map((b) => (
                <BookingRow
                  key={b.id}
                  booking={b}
                  onDetails={openDetails}
                  onPay={openPayment}
                  onCancel={cancelBooking}
                />
              ))
            ) : (
              <EmptyState
                icon={Calendar}
                title="Nenhuma reserva próxima"
                message="Você não tem reservas agendadas para os próximos dias."
                showCTA
              />
            )}
          </TabsContent>

          <TabsContent value="today" className="space-y-2 mt-4">
            {today.length > 0 ? (
              today.map((b) => (
                <BookingRow
                  key={b.id}
                  booking={b}
                  onDetails={openDetails}
                  onPay={openPayment}
                  onCancel={cancelBooking}
                />
              ))
            ) : (
              <EmptyState
                icon={Clock}
                title="Nenhuma reserva hoje"
                message="Você não tem reservas agendadas para hoje."
              />
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-2 mt-4">
            {past.length > 0 ? (
              past.map((b) => (
                <BookingRow
                  key={b.id}
                  booking={b}
                  onDetails={openDetails}
                  onPay={openPayment}
                  onCancel={cancelBooking}
                />
              ))
            ) : (
              <EmptyState
                icon={Calendar}
                title="Nenhuma reserva no histórico"
                message="Você ainda não tem reservas concluídas ou canceladas."
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Details modal ──────────────────────────────────────────────── */}
      <BookingDetailsDialog
        bookingId={detailsBookingId}
        seedBooking={detailsSeed}
        open={showDetails}
        onClose={closeDetails}
        onPayRequest={(b) => {
          closeDetails();
          requestAnimationFrame(() => openPayment(b));
        }}
      />

      {/* ── Payment modal ──────────────────────────────────────────────── */}
      <Dialog
        open={!!paymentBooking}
        onOpenChange={(open) => { if (!open) setPaymentBooking(null); }}
      >
        {paymentBooking && (
          <PaymentDialog
            booking={paymentBooking}
            onSuccess={() => {
              setPaymentBooking(null);
              fetchBookings();
              // Refresh details modal if it was opened for the same booking
              if (showDetails && detailsBookingId === paymentBooking.id) {
                // Re-trigger fetch inside BookingDetailsDialog by toggling & re-opening
                setShowDetails(false);
                setTimeout(() => setShowDetails(true), 50);
              }
            }}
            onCancel={() => setPaymentBooking(null)}
          />
        )}
      </Dialog>
    </AppLayout>
  );
}