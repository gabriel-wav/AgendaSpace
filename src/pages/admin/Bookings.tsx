import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Search, Filter, Eye, Edit, X, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { fetchBookings, updateBookingStatus, Booking, BookingStatus } from '@/lib/bookings.api';
import { formatBRL } from '@/lib/utils';
import { getAbsoluteImageUrl } from '@/lib/api';
import { SpaceImage } from '@/components/spaces/SpaceImage';
import { BookingDetailsDialog } from '@/components/bookings/BookingDetailsDialog';

// Booking type is imported from bookings.api
interface BookingsProps {
  mode?: 'admin' | 'host';
}

export default function Bookings({ mode = 'admin' }: BookingsProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<Date>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const data = await fetchBookings(mode === 'host' ? 'host' : undefined);
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

  const handleUpdateStatus = async (bookingId: string, newStatus: BookingStatus) => {
    try {
      await updateBookingStatus(bookingId, { status: newStatus });
      toast({
        title: "Status atualizado",
        description: "O status da reserva foi atualizado com sucesso."
      });
      await loadBookings();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message || "Ocorreu um erro ao atualizar.",
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

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.space?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || booking.status.toLowerCase() === statusFilter.toLowerCase();

    const matchesDate = !dateFilter || 
      new Date(booking.startDatetime).toDateString() === dateFilter.toDateString();

    const matchesHost = mode === 'admin' || booking.space?.createdById === user?.id;

    return matchesSearch && matchesStatus && matchesDate && matchesHost;
  });

  const groupedBookings = filteredBookings.reduce((acc, booking) => {
    const spaceId = booking.space?.id || 'deleted-space';
    if (!acc[spaceId]) {
      acc[spaceId] = {
        space: booking.space,
        bookings: []
      };
    }
    acc[spaceId].bookings.push(booking);
    return acc;
  }, {} as Record<string, { space: any, bookings: Booking[] }>);

  const sortedGroups = Object.values(groupedBookings).sort((a, b) => {
    const pendingA = a.bookings.filter(bk => bk.status.toLowerCase() === 'pending').length;
    const pendingB = b.bookings.filter(bk => bk.status.toLowerCase() === 'pending').length;
    if (pendingA !== pendingB) return pendingB - pendingA;
    return (a.space?.name || '').localeCompare(b.space?.name || '');
  });

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando reservas...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {mode === 'admin' ? 'Gerenciar Todas as Reservas' : 'Reservas Recebidas'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {mode === 'admin' 
              ? 'Visualize e gerencie todas as reservas da plataforma'
              : 'Gerencie as reservas recebidas nos seus espaços'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{bookings.filter(b => b.status.toLowerCase() === 'pending').length}</div>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{bookings.filter(b => b.status.toLowerCase() === 'confirmed').length}</div>
              <p className="text-xs text-muted-foreground">Confirmadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{bookings.filter(b => b.status.toLowerCase() === 'completed').length}</div>
              <p className="text-xs text-muted-foreground">Concluídas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{bookings.filter(b => b.status.toLowerCase() === 'cancelled').length}</div>
              <p className="text-xs text-muted-foreground">Canceladas</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por usuário, espaço ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="confirmed">Confirmada</SelectItem>
                  <SelectItem value="completed">Concluída</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full md:w-48 justify-start text-left font-normal",
                      !dateFilter && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFilter ? format(dateFilter, "dd/MM/yyyy", { locale: ptBR }) : "Filtrar por data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 shadow-xl" align="end">
                  <Calendar
                    mode="single"
                    selected={dateFilter}
                    onSelect={(date) => {
                      setDateFilter(date);
                      setCalendarOpen(false);
                    }}
                    locale={ptBR}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {dateFilter && (
                <Button variant="outline" onClick={() => setDateFilter(undefined)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bookings List */}
        <Card>
          <CardHeader>
            <CardTitle>Reservas ({filteredBookings.length})</CardTitle>
            <CardDescription>
              Lista de todas as reservas filtradas, agrupadas por espaço.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sortedGroups.length > 0 ? (
              <div className="space-y-6">
                {sortedGroups.map((group) => {
                  const space = group.space;
                  const img = space?.images?.[0]?.url || space?.imageUrl || (space as any)?.image_url;

                  return (
                    <Card key={space?.id || 'deleted'} className="overflow-hidden border border-border/70">
                      {/* Cabeçalho do Card (Espaço) */}
                      <div className="bg-muted/40 p-4 border-b border-border/70 flex items-center gap-4">
                        <div className="w-12 h-12 shrink-0 rounded overflow-hidden border">
                          <SpaceImage
                            src={img}
                            alt={space?.name || 'Espaço'}
                            containerClassName="w-full h-full bg-muted flex items-center justify-center"
                            iconClassName="h-5 w-5 text-muted-foreground"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base text-foreground truncate">
                            {space?.name || 'Espaço Excluído'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {group.bookings.length} {group.bookings.length === 1 ? 'reserva' : 'reservas'}
                          </p>
                        </div>
                      </div>

                      {/* Lista de Reservas do Espaço */}
                      <div className="divide-y divide-border/60">
                        {group.bookings
                          .sort((a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime())
                          .map((booking) => {
                            let cancelLabel = null;
                            if (booking.status === 'CANCELLED' && booking.cancellationReason === 'UNPAID_AT_START') {
                              cancelLabel = 'Cancelada por falta de pagamento';
                            }

                            return (
                              <div key={booking.id} className="p-4 hover:bg-muted/50 transition-colors">
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-3">
                                      <Badge variant={getStatusColor(booking.status)}>
                                        {getStatusLabel(booking.status)}
                                      </Badge>
                                      {booking.status.toLowerCase() === 'pending' && (
                                        <span className="text-[10px] sm:text-xs font-medium text-amber-600 bg-amber-100/50 px-2 py-0.5 rounded-full border border-amber-200">
                                          {booking.approvalStatus !== 'APPROVED' ? 'Aguardando Aprovação' : 'Aguardando Pagamento'}
                                        </span>
                                      )}
                                      {cancelLabel && (
                                        <span className="text-[10px] sm:text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full border border-destructive/20">
                                          {cancelLabel}
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                                      <div>
                                        <span className="font-medium">Usuário:</span> {booking.user?.fullName}
                                      </div>
                                      <div>
                                        <span className="font-medium">Email:</span> {booking.user?.email}
                                      </div>
                                      <div>
                                        <span className="font-medium">Data:</span> {' '}
                                        {format(new Date(booking.startDatetime), "dd/MM/yyyy", { locale: ptBR })}
                                      </div>
                                      <div>
                                        <span className="font-medium">Horário:</span> {' '}
                                        {format(new Date(booking.startDatetime), "HH:mm")} - {' '}
                                        {format(new Date(booking.endDatetime), "HH:mm")}
                                      </div>
                                      <div>
                                        <span className="font-medium">Capacidade:</span> {booking.space?.capacity || 'N/A'} pessoas
                                      </div>
                                      <div>
                                        <span className="font-medium">Valor:</span> {formatBRL(booking.totalPrice)}
                                      </div>
                                    </div>

                                    {booking.notes && (
                                      <div className="text-sm">
                                        <span className="font-medium">Observações:</span> {booking.notes}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex sm:flex-col gap-2 flex-wrap sm:ml-4 w-full sm:w-auto">
                                    {booking.status.toLowerCase() === 'pending' && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="default"
                                          onClick={() => handleUpdateStatus(booking.id, 'CONFIRMED')}
                                        >
                                          Confirmar (Manual)
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleUpdateStatus(booking.id, 'CANCELLED')}
                                        >
                                          Cancelar
                                        </Button>
                                      </>
                                    )}
                                    {booking.status.toLowerCase() === 'confirmed' && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleUpdateStatus(booking.id, 'COMPLETED')}
                                        >
                                          Marcar como Realizada
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-destructive hover:bg-destructive/10"
                                          onClick={() => handleUpdateStatus(booking.id, 'CANCELLED')}
                                        >
                                          Cancelar
                                        </Button>
                                      </>
                                    )}
                                    <Button 
                                      size="sm" 
                                      variant="ghost"
                                      onClick={() => setSelectedBooking(booking)}
                                      title="Ver detalhes completos"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                        })}
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma reserva encontrada</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' || dateFilter
                    ? 'Tente alterar os filtros de busca.'
                    : 'Ainda não há reservas cadastradas no sistema.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detailed Modal for Booking Inspection */}
        <BookingDetailsDialog
          booking={selectedBooking}
          open={selectedBooking !== null}
          onClose={() => setSelectedBooking(null)}
          onUpdateStatus={handleUpdateStatus}
          isAdminOrHost={true}
        />
      </div>
    </AppLayout>
  );
}