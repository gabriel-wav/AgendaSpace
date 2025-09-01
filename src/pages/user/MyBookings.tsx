import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, MapPin, Eye, Edit, X, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, isPast, isToday, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Booking {
  id: string;
  space_id: string;
  start_datetime: string;
  end_datetime: string;
  total_price: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  spaces?: {
    name: string;
    capacity: number;
    resources: string[];
  };
}

export default function MyBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
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
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          spaces:space_id (name, capacity, resources)
        `)
        .eq('user_id', user?.id)
        .order('start_datetime', { ascending: false });

      if (error) throw error;
      setBookings((data || []) as Booking[]);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar reservas",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (bookingId: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta reserva?')) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Reserva cancelada",
        description: "Sua reserva foi cancelada com sucesso."
      });

      await fetchBookings();
    } catch (error: any) {
      toast({
        title: "Erro ao cancelar reserva",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
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
    switch (status) {
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
    const bookingStart = new Date(booking.start_datetime);
    const now = new Date();
    const hoursUntilBooking = (bookingStart.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return booking.status !== 'cancelled' && 
           booking.status !== 'completed' && 
           hoursUntilBooking > 2; // Can cancel up to 2 hours before
  };

  const categorizeBookings = () => {
    const upcoming = bookings.filter(booking => 
      isFuture(new Date(booking.start_datetime)) && 
      ['pending', 'confirmed'].includes(booking.status)
    );
    
    const today = bookings.filter(booking => 
      isToday(new Date(booking.start_datetime)) && 
      ['pending', 'confirmed'].includes(booking.status)
    );
    
    const past = bookings.filter(booking => 
      isPast(new Date(booking.end_datetime)) || 
      ['completed', 'cancelled'].includes(booking.status)
    );

    return { upcoming, today, past };
  };

  const renderBookingCard = (booking: Booking) => (
    <Card key={booking.id} className="mb-4">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-medium">{booking.spaces?.name}</h3>
              <Badge variant={getStatusColor(booking.status)}>
                {getStatusLabel(booking.status)}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(booking.start_datetime), "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>
                  {format(new Date(booking.start_datetime), "HH:mm")} - {' '}
                  {format(new Date(booking.end_datetime), "HH:mm")}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{booking.spaces?.capacity} pessoas</span>
              </div>
              <div>
                <span className="font-medium">R$ {booking.total_price.toFixed(2)}</span>
              </div>
            </div>

            {booking.spaces?.resources && booking.spaces.resources.length > 0 && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-1">
                  {booking.spaces.resources.map((resource) => (
                    <Badge key={resource} variant="outline" className="text-xs">
                      {resource}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {booking.notes && (
              <div className="text-sm border-l-2 border-muted pl-3 mt-2">
                <span className="font-medium">Observações:</span> {booking.notes}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 ml-4">
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => {
                toast({
                  title: "Detalhes da Reserva",
                  description: `${booking.spaces?.name} - ${format(new Date(booking.start_datetime), "dd/MM/yyyy HH:mm")}`,
                });
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {canCancelBooking(booking) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => cancelBooking(booking.id)}
                className="text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4" />
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
              <div className="text-2xl font-bold">{bookings.filter(b => b.status === 'pending').length}</div>
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
    </AppLayout>
  );
}