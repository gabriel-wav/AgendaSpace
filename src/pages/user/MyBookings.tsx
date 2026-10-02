import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, MapPin, Eye, Edit, X, Plus, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, isPast, isToday, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Dialog } from '@/components/ui/dialog';
import { PaymentDialog } from '@/components/booking/PaymentDialog';
import { fetchMyBookings as apiFetchBookings, updateBookingStatus, Booking, BookingStatus } from '@/lib/bookings.api';
import { formatBRL } from '@/lib/utils';

// Booking interface is now imported from bookings.api.ts

export default function MyBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    try {
      const data = await apiFetchBookings();
      setBookings(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar reservas",
        description: error.message || "Não foi possível carregar as reservas.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (bookingId: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta reserva?')) return;

    try {
      await updateBookingStatus(bookingId, { status: 'CANCELLED' });

      toast({
        title: "Reserva cancelada",
        description: "Sua reserva foi cancelada com sucesso."
      });

      await fetchBookings();
    } catch (error: any) {
      toast({
        title: "Erro ao cancelar reserva",
        description: error.message || "Não foi possível cancelar.",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'completed':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'Confirmada';
      case 'pending':
        return 'Pendente';
      case 'completed':
        return 'Concluída';
      case 'cancelled':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const canCancelBooking = (booking: Booking) => {
    const bookingStart = new Date(booking.startDatetime);
    const now = new Date();
    const hoursUntilBooking = (bookingStart.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return booking.status.toLowerCase() !== 'cancelled' && 
           booking.status.toLowerCase() !== 'completed' && 
           hoursUntilBooking > 2; // Can cancel up to 2 hours before
  };

  const categorizeBookings = () => {
    const upcoming = bookings.filter(booking => 
      isFuture(new Date(booking.startDatetime)) && 
      !isToday(new Date(booking.startDatetime)) &&
      ['pending', 'confirmed'].includes(booking.status.toLowerCase())
    );
    
    const today = bookings.filter(booking => 
      isToday(new Date(booking.startDatetime)) && 
      ['pending', 'confirmed'].includes(booking.status.toLowerCase())
    );
    
    const past = bookings.filter(booking => 
      isPast(new Date(booking.endDatetime)) || 
      ['completed', 'cancelled'].includes(booking.status.toLowerCase())
    );

    return { upcoming, today, past };
  };

  const renderBookingCard = (booking: Booking) => (
    <Card key={booking.id} className="mb-4">
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-medium text-foreground">{booking.space?.name}</h3>
              <Badge variant={getStatusColor(booking.status)}>
                {getStatusLabel(booking.status)}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-primary" />
                <span>{format(new Date(booking.startDatetime), "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-primary" />
                <span>
                  {format(new Date(booking.startDatetime), "HH:mm")} - {' '}
                  {format(new Date(booking.endDatetime), "HH:mm")}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{booking.space?.capacity || 'N/A'} pessoas</span>
              </div>
              <div>
                <span className="font-medium text-foreground">{formatBRL(booking.totalPrice)}</span>
              </div>
            </div>

            {booking.space?.resources && booking.space.resources.length > 0 && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-1">
                  {booking.space.resources.map((resource) => (
                    <Badge key={resource} variant="outline" className="text-xs">
                      {resource}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {booking.notes && (
              <div className="text-sm border-l-2 border-primary/40 pl-3 mt-2 text-muted-foreground">
                <span className="font-medium text-foreground">Observações:</span> {booking.notes}
              </div>
            )}
          </div>

          <div className="flex sm:flex-col gap-2 flex-wrap sm:ml-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
            {booking.status.toLowerCase() === 'pending' && (
              <Button size="sm" onClick={() => setPaymentBooking(booking)} className="flex-1 sm:flex-none">
                <DollarSign className="mr-1.5 h-4 w-4" />
                Pagar para Confirmar
              </Button>
            )}
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => {
                toast({
                  title: "Detalhes da Reserva",
                  description: `${booking.space?.name} - ${format(new Date(booking.startDatetime), "dd/MM/yyyy HH:mm")}`,
                });
              }}
              className="flex-1 sm:flex-none"
            >
              <Eye className="h-4 w-4 mr-1 sm:mr-0" />
              <span className="sm:hidden text-xs">Ver</span>
            </Button>
            {canCancelBooking(booking) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => cancelBooking(booking.id)}
                className="text-destructive hover:text-destructive flex-1 sm:flex-none"
              >
                <X className="h-4 w-4 mr-1" />
                <span>{booking.status.toLowerCase() === 'pending' ? 'Cancelar Pedido' : 'Cancelar'}</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando suas reservas...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const { upcoming, today, past } = categorizeBookings();

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Minhas Reservas</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie todas as suas reservas de espaços
            </p>
          </div>
          <Button onClick={() => navigate('/spaces')} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Fazer Nova Reserva
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{today.length}</div>
              <p className="text-xs text-muted-foreground">Hoje</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{upcoming.length}</div>
              <p className="text-xs text-muted-foreground">Próximas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{bookings.filter(b => b.status.toLowerCase() === 'pending').length}</div>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{past.length}</div>
              <p className="text-xs text-muted-foreground">Históricas</p>
            </CardContent>
          </Card>
        </div>

        {/* Bookings Tabs */}
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upcoming">Próximas ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="today">Hoje ({today.length})</TabsTrigger>
            <TabsTrigger value="past">Históricas ({past.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {upcoming.length > 0 ? (
              upcoming.map(renderBookingCard)
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma reserva próxima</h3>
                  <p className="text-muted-foreground mb-4">
                    Você não tem reservas agendadas para os próximos dias.
                  </p>
                  <Button onClick={() => navigate('/spaces')}>Fazer Nova Reserva</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="today" className="space-y-4">
            {today.length > 0 ? (
              today.map(renderBookingCard)
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma reserva hoje</h3>
                  <p className="text-muted-foreground">
                    Você não tem reservas agendadas para hoje.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {past.length > 0 ? (
              past.map(renderBookingCard)
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma reserva no histórico</h3>
                  <p className="text-muted-foreground">
                    Você ainda não tem reservas concluídas ou canceladas.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
         <Dialog open={!!paymentBooking} onOpenChange={(open) => !open && setPaymentBooking(null)}>
         {paymentBooking && (
           <PaymentDialog
             booking={paymentBooking}
             onSuccess={() => {
               setPaymentBooking(null);
               fetchBookings();
             }}
             onCancel={() => setPaymentBooking(null)}
           />
         )}
       </Dialog>
    </AppLayout>
  );
}