import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, Calendar, DollarSign, Users, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReportData {
  totalBookings: number;
  totalRevenue: number;
  totalUsers: number;
  totalSpaces: number;
  recentBookings: any[];
  monthlyRevenue: number;
  pendingBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
}

export default function AdminReports() {
  const [reportData, setReportData] = useState<ReportData>({
    totalBookings: 0,
    totalRevenue: 0,
    totalUsers: 0,
    totalSpaces: 0,
    recentBookings: [],
    monthlyRevenue: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    cancelledBookings: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      // Buscar dados de reservas
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          spaces:space_id (name)
        `);

      if (bookingsError) throw bookingsError;

      // Buscar dados de usuários
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('*');

      if (usersError) throw usersError;

      // Buscar dados de espaços
      const { data: spaces, error: spacesError } = await supabase
        .from('spaces')
        .select('*');

      if (spacesError) throw spacesError;

      // Calcular estatísticas
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      const totalRevenue = bookings?.reduce((sum, booking) => 
        sum + Number(booking.total_price), 0) || 0;

      const monthlyBookings = bookings?.filter(booking => {
        const bookingDate = new Date(booking.created_at);
        return bookingDate >= monthStart && bookingDate <= monthEnd;
      }) || [];

      const monthlyRevenue = monthlyBookings.reduce((sum, booking) => 
        sum + Number(booking.total_price), 0);

      const pendingBookings = bookings?.filter(b => b.status === 'pending').length || 0;
      const confirmedBookings = bookings?.filter(b => b.status === 'confirmed').length || 0;
      const cancelledBookings = bookings?.filter(b => b.status === 'cancelled').length || 0;

      // Reservas recentes (últimos 7 dias)
      const sevenDaysAgo = subDays(now, 7);
      const recentBookings = bookings?.filter(booking => 
        new Date(booking.created_at) >= sevenDaysAgo
      ).slice(0, 10) || [];

      setReportData({
        totalBookings: bookings?.length || 0,
        totalRevenue,
        totalUsers: users?.length || 0,
        totalSpaces: spaces?.length || 0,
        recentBookings,
        monthlyRevenue,
        pendingBookings,
        confirmedBookings,
        cancelledBookings
      });

    } catch (error: any) {
      console.error('Erro ao carregar relatórios:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados dos relatórios.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmada';
      case 'pending': return 'Pendente';
      case 'cancelled': return 'Cancelada';
      case 'completed': return 'Concluída';
      default: return status;
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Carregando relatórios...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
            <p className="text-muted-foreground">Análises e estatísticas do sistema</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Reservas</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.totalBookings}</div>
              <p className="text-xs text-muted-foreground">
                {reportData.pendingBookings} pendentes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(reportData.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(reportData.monthlyRevenue)} este mês
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                Usuários cadastrados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Espaços</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.totalSpaces}</div>
              <p className="text-xs text-muted-foreground">
                Espaços disponíveis
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="bookings">Reservas</TabsTrigger>
            <TabsTrigger value="revenue">Receita</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Status das Reservas</CardTitle>
                  <CardDescription>Distribuição atual das reservas por status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Confirmadas</span>
                      <span className="text-sm font-medium">{reportData.confirmedBookings}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{
                          width: `${(reportData.confirmedBookings / reportData.totalBookings) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Pendentes</span>
                      <span className="text-sm font-medium">{reportData.pendingBookings}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full" 
                        style={{
                          width: `${(reportData.pendingBookings / reportData.totalBookings) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Canceladas</span>
                      <span className="text-sm font-medium">{reportData.cancelledBookings}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full" 
                        style={{
                          width: `${(reportData.cancelledBookings / reportData.totalBookings) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Reservas Recentes</CardTitle>
                  <CardDescription>Últimas reservas dos últimos 7 dias</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {reportData.recentBookings.slice(0, 5).map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{booking.spaces?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(booking.start_datetime), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{formatCurrency(Number(booking.total_price))}</span>
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(booking.status)}`}></div>
                        </div>
                      </div>
                    ))}

                    {reportData.recentBookings.length === 0 && (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">Nenhuma reserva recente</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas de Reservas</CardTitle>
                <CardDescription>Análise detalhada das reservas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{reportData.confirmedBookings}</div>
                    <p className="text-sm text-muted-foreground">Confirmadas</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-600">{reportData.pendingBookings}</div>
                    <p className="text-sm text-muted-foreground">Pendentes</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-600">{reportData.cancelledBookings}</div>
                    <p className="text-sm text-muted-foreground">Canceladas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Análise de Receita</CardTitle>
                <CardDescription>Informações financeiras do sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">{formatCurrency(reportData.totalRevenue)}</div>
                    <p className="text-sm text-muted-foreground">Receita Total</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{formatCurrency(reportData.monthlyRevenue)}</div>
                    <p className="text-sm text-muted-foreground">Receita do Mês</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}