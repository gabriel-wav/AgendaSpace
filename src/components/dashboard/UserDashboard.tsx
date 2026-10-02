import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Clock, Search, Plus, Building2, Eye, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Dialog } from '@/components/ui/dialog';
import { BookingFlowDialog } from '@/components/booking/BookingFlowDialog';
import { BookingDetailsDialog } from '@/components/booking/BookingDetailsDialog';
import { PaymentDialog } from '@/components/booking/PaymentDialog';
import { Booking } from '@/lib/bookings.api';
import { fetchSpaces } from '@/lib/spaces.api';
import { fetchClientStats, fetchHostStats } from '@/lib/dashboard.api';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User } from 'lucide-react';

export function UserDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedBookingSeed, setSelectedBookingSeed] = useState<Booking | null>(null);
  const [selectedSpace, setSelectedSpace] = useState<any>(null);
  const [bookingToPay, setBookingToPay] = useState<Booking | null>(null);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [stats, setStats] = useState({
    upcomingBookings: 0,
    totalHours: 0,
    availableSpaces: 0
  });
  const [loading, setLoading] = useState(true);
  const [hostStats, setHostStats] = useState<any>(null);

  // Fetch real data from database
  const fetchData = async () => {
    try {
      const [spacesData, clientData, hostData] = await Promise.all([
        fetchSpaces(true).catch(() => []),
        fetchClientStats().catch(() => null),
        fetchHostStats().catch(() => null),
      ]);

      setSpaces(spacesData.slice(0, 3));

      if (clientData) {
        setStats({
          upcomingBookings: clientData.upcomingBookings,
          totalHours: Math.round(clientData.totalHours),
          availableSpaces: clientData.availableSpaces,
        });
        setBookings(clientData.recentBookings || []);
      }
      
      if (hostData && hostData.totalSpaces > 0) {
        setHostStats(hostData);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.response?.data?.message || error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);


  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Olá, {user?.fullName?.split(' ')[0] || 'Usuário'}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Encontre e reserve o espaço perfeito para suas necessidades
            </p>
          </div>
          <Link to="/spaces">
            <Button>
              <Search className="mr-2 h-4 w-4" />
              Buscar Espaços
            </Button>
          </Link>
        </div>

        {/* Painel do Usuário */}
        <div className="mt-8 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Painel do Usuário
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Próximas Reservas</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcomingBookings}</div>
              <p className="text-xs text-muted-foreground">Confirmadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Espaços Disponíveis</CardTitle>
              <MapPin className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.availableSpaces}</div>
              <p className="text-xs text-muted-foreground">Disponíveis para reserva</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Total</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalHours}h</div>
              <p className="text-xs text-muted-foreground">Próximas reservas</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Visão de Anfitrião (Host) */}
        {hostStats && (
          <div className="mt-8 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Painel do Anfitrião
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Meus Espaços</CardTitle>
                  <Building2 className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{hostStats.totalSpaces}</div>
                  <p className="text-xs text-muted-foreground">Cadastrados</p>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Reservas Hoje</CardTitle>
                  <Calendar className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{hostStats.todayBookings}</div>
                  <p className="text-xs text-muted-foreground">Nos seus espaços</p>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Receita Mensal (Simulada)</CardTitle>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">R$ {Number(hostStats.monthlyRevenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <p className="text-xs text-muted-foreground">Pagas e não canceladas</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* My Bookings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-primary" />
              Minhas Próximas Reservas
            </CardTitle>
            <CardDescription>
              Suas reservas confirmadas e pendentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando reservas...</p>
              </div>
            ) : bookings.length > 0 ? (
              <div className="space-y-4">
                {bookings.map((booking) => {
                  const spaceObj = booking.space || booking.spaces;
                  const startDt = booking.startDatetime || booking.start_datetime;
                  const endDt = booking.endDatetime || booking.end_datetime;
                  const resources = Array.isArray(spaceObj?.resources) ? spaceObj.resources : [];

                  return (
                    <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <h3 className="font-medium">{spaceObj?.name || 'Espaço'}</h3>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(startDt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} - {format(new Date(endDt), "HH:mm", { locale: ptBR })}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs bg-muted px-2 py-1 rounded">
                            {spaceObj?.capacity} pessoas
                          </span>
                          {resources.slice(0, 2).map((resource: string) => (
                            <span key={resource} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                              {resource}
                            </span>
                          ))}
                          {resources.length > 2 && (
                            <span className="text-xs bg-muted px-2 py-1 rounded">
                              +{resources.length - 2}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={String(booking.status).toUpperCase() === 'CONFIRMED' ? 'default' : String(booking.status).toUpperCase() === 'PENDING' ? 'secondary' : 'outline'}
                        >
                          {String(booking.status).toUpperCase() === 'CONFIRMED' ? 'Confirmado' : 
                           String(booking.status).toUpperCase() === 'PENDING' ? 'Pendente' : 
                           String(booking.status).toUpperCase() === 'COMPLETED' ? 'Realizado' : 'Cancelado'}
                        </Badge>
                        <div className="mt-2">
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => {
                               setSelectedBookingSeed(booking as Booking);
                               setSelectedBookingId(booking.id);
                               setDetailsOpen(true);
                             }}
                           >
                             <Eye className="mr-1 h-3 w-3" />
                             Detalhes
                           </Button>
                         </div>
                      </div>
                    </div>
                  );
              })}
            </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma reserva encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  Você ainda não tem reservas. Que tal explorar nossos espaços?
                </p>
                <Link to="/spaces">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Fazer Primeira Reserva
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Popular Spaces */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="mr-2 h-5 w-5 text-primary" />
              Espaços Populares
            </CardTitle>
            <CardDescription>
              Os espaços mais reservados pelos usuários
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando espaços...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {spaces.map((space) => (
                  <div key={space.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <Building2 className="h-12 w-12 text-primary" />
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium mb-2">{space.name}</h3>
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                        <span>{space.capacity} pessoas</span>
                        <span className="font-medium text-foreground">R$ {space.pricePerHour || space.price_per_hour}/h</span>
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => setSelectedSpace(space)}
                      >
                        Reservar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Booking Flow Modal */}
      <BookingFlowDialog
        space={selectedSpace}
        open={!!selectedSpace}
        onOpenChange={(open) => !open && setSelectedSpace(null)}
        onCompleted={() => {
          setSelectedSpace(null);
          fetchData();
        }}
      />


      {/* Booking Details Modal */}
      <BookingDetailsDialog
        bookingId={selectedBookingId}
        seedBooking={selectedBookingSeed}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        onPayRequest={(b) => {
          setDetailsOpen(false);
          requestAnimationFrame(() => setBookingToPay(b));
        }}
      />

      {bookingToPay && (
        <Dialog open={true} onOpenChange={(open) => !open && setBookingToPay(null)}>
          <PaymentDialog
            booking={bookingToPay}
            onSuccess={() => {
              setBookingToPay(null);
              fetchData();
            }}
            onCancel={() => {
              setBookingToPay(null);
            }}
          />
        </Dialog>
      )}
    </AppLayout>
  );
}