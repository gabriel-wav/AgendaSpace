import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, DollarSign, Search, CheckCircle2, XCircle, Building2, User, Check, Ban } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fetchHostBookings, updateBookingStatus, Booking, BookingStatus } from '@/lib/bookings.api';

/**
 * Página "Reservas Recebidas" (/host/bookings)
 * Permite que anfitriões acompanhem e aprovem reservas feitas pelos clientes em seus espaços anunciados.
 */
export default function ReceivedBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await fetchHostBookings();
      setBookings(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar reservas recebidas',
        description: error.response?.data?.message || error.message || 'Não foi possível carregar as reservas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (bookingId: string, newStatus: BookingStatus) => {
    setActionInProgress(bookingId);
    try {
      await updateBookingStatus(bookingId, { status: newStatus });
      toast({
        title: 'Status atualizado com sucesso',
        description: `A reserva foi marcada como ${getStatusLabel(newStatus).toLowerCase()}.`,
      });
      await loadBookings();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar reserva',
        description: error.response?.data?.message || error.message || 'Ocorreu um erro ao atualizar.',
        variant: 'destructive',
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'CONFIRMED':
        return <Badge className="bg-emerald-600/90 text-white">Confirmada</Badge>;
      case 'PENDING':
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border border-amber-500/30">Pendente</Badge>;
      case 'COMPLETED':
        return <Badge variant="outline" className="text-muted-foreground">Concluída</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toUpperCase()) {
      case 'CONFIRMED':
        return 'Confirmada';
      case 'PENDING':
        return 'Pendente';
      case 'COMPLETED':
        return 'Concluída';
      case 'CANCELLED':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.space?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.notes?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      booking.status.toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  const pendingCount = bookings.filter((b) => b.status === 'PENDING').length;
  const confirmedCount = bookings.filter((b) => b.status === 'CONFIRMED').length;
  const totalRevenue = bookings
    .filter((b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
    .reduce((acc, curr) => acc + Number(curr.totalPrice), 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Reservas Recebidas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie os pedidos de reserva e clientes dos seus espaços anunciados
          </p>
        </div>

        {/* Resumo Métricas */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes de Confirmação</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
              <p className="text-xs text-muted-foreground">Aguardando sua ação como anfitrião</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reservas Confirmadas</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{confirmedCount}</div>
              <p className="text-xs text-muted-foreground">Prontas para uso pelos clientes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Estimada</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-xs text-muted-foreground">De reservas confirmadas e concluídas</p>
            </CardContent>
          </Card>
        </div>

        {/* Barra de Filtro e Busca */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
            <Input
              placeholder="Buscar por cliente, email ou espaço..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="PENDING">Pendentes</SelectItem>
                <SelectItem value="CONFIRMED">Confirmadas</SelectItem>
                <SelectItem value="COMPLETED">Concluídas</SelectItem>
                <SelectItem value="CANCELLED">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Lista de Reservas Recebidas */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-28 rounded-md border border-border/60 bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          <Card className="py-16 text-center">
            <CardContent className="flex flex-col items-center justify-center gap-3">
              <Building2 className="h-10 w-10 text-muted-foreground/40" />
              <div className="text-base font-medium">Nenhuma reserva recebida</div>
              <p className="text-sm text-muted-foreground max-w-md">
                {searchTerm || statusFilter !== 'all'
                  ? 'Nenhum resultado corresponde aos filtros aplicados.'
                  : 'Assim que outros usuários reservarem seus espaços cadastrados, as solicitações aparecerão aqui.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              const start = new Date(booking.startDatetime);
              const end = new Date(booking.endDatetime);
              const isPending = booking.status.toUpperCase() === 'PENDING';
              const isConfirmed = booking.status.toUpperCase() === 'CONFIRMED';
              const isBusy = actionInProgress === booking.id;

              return (
                <Card key={booking.id} className="overflow-hidden border border-border/70 hover:border-border transition-colors">
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-foreground text-base">
                          {booking.space?.name || 'Espaço sem nome'}
                        </span>
                        {getStatusBadge(booking.status)}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5 font-medium text-foreground">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          {booking.user?.fullName || 'Cliente'} ({booking.user?.email})
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(start, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                        </span>
                        <span className="flex items-center gap-1.5 font-medium text-foreground">
                          <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                          {Number(booking.totalPrice).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </span>
                      </div>

                      {booking.notes && (
                        <p className="text-xs text-muted-foreground/80 italic">
                          "{booking.notes}"
                        </p>
                      )}
                    </div>

                    {/* Ações do Anfitrião */}
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      {isPending && (
                        <>
                          <Button
                            size="sm"
                            disabled={isBusy}
                            onClick={() => handleUpdateStatus(booking.id, 'CONFIRMED')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs h-8"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() => handleUpdateStatus(booking.id, 'CANCELLED')}
                            className="text-destructive hover:bg-destructive/10 gap-1.5 text-xs h-8"
                          >
                            <Ban className="h-3.5 w-3.5" />
                            Recusar
                          </Button>
                        </>
                      )}

                      {isConfirmed && (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={isBusy}
                            onClick={() => handleUpdateStatus(booking.id, 'COMPLETED')}
                            className="gap-1.5 text-xs h-8"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Concluir
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isBusy}
                            onClick={() => handleUpdateStatus(booking.id, 'CANCELLED')}
                            className="text-destructive hover:bg-destructive/10 text-xs h-8"
                          >
                            Cancelar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
