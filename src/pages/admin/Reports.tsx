import React, { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  DollarSign,
  Users,
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  CreditCard,
  QrCode,
  PieChart as PieChartIcon,
  Activity,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchBookings as apiFetchBookings, Booking } from '@/lib/bookings.api';
import { fetchAdminStats } from '@/lib/dashboard.api';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FeedReportsList } from '@/components/admin/FeedReportsList';
import { SpaceImage } from '@/components/spaces/SpaceImage';
import { getSpaceImg } from '@/components/spaces/SpaceCard';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface ReportData {
  totalBookings: number;
  totalRevenue: number;
  totalUsers: number;
  totalSpaces: number;
  recentBookings: Booking[];
  allBookings: Booking[];
  monthlyRevenue: number;
  pendingBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
}

const STATUS_COLORS = {
  confirmed: '#10b981', // emerald-500
  completed: '#3b82f6', // blue-500
  pending: '#f59e0b',   // amber-500
  cancelled: '#ef4444', // red-500
};

export default function AdminReports() {
  const [reportData, setReportData] = useState<ReportData>({
    totalBookings: 0,
    totalRevenue: 0,
    totalUsers: 0,
    totalSpaces: 0,
    recentBookings: [],
    allBookings: [],
    monthlyRevenue: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      const [bookings, adminStats] = await Promise.all([
        apiFetchBookings(),
        fetchAdminStats(),
      ]);

      const bks = bookings || [];
      const pendingBookings = bks.filter(b => b.status.toLowerCase() === 'pending').length;
      const confirmedBookings = bks.filter(b => b.status.toLowerCase() === 'confirmed').length;
      const completedBookings = bks.filter(b => b.status.toLowerCase() === 'completed').length;
      const cancelledBookings = bks.filter(b => b.status.toLowerCase() === 'cancelled').length;

      // Reservas recentes (últimos 7 dias ou mais recentes)
      const now = new Date();
      const sevenDaysAgo = subDays(now, 7);
      const recentBookings = bks
        .filter(b => new Date(b.createdAt) >= sevenDaysAgo || new Date(b.startDatetime) >= sevenDaysAgo)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8);

      const fallbackRecent = recentBookings.length > 0 
        ? recentBookings 
        : [...bks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8);

      const monthlyRevenue = Number(adminStats.monthlyRevenue) || 0;
      const totalRevenue = bks
        .filter(b => b.status.toLowerCase() === 'confirmed' || b.status.toLowerCase() === 'completed')
        .reduce((sum, b) => sum + Number(b.totalPrice), 0);

      setReportData({
        totalBookings: bks.length,
        totalRevenue,
        totalUsers: adminStats.activeUsers || 0,
        totalSpaces: adminStats.totalSpaces || 0,
        recentBookings: fallbackRecent,
        allBookings: bks,
        monthlyRevenue,
        pendingBookings,
        confirmedBookings,
        completedBookings,
        cancelledBookings,
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
      currency: 'BRL',
    }).format(value);
  };

  // ─── Dados dos Gráficos de Reservas ──────────────────────────────────────────

  const bookingsTimelineData = useMemo(() => {
    const map = new Map<string, { date: string; confirmadas: number; pendentes: number; canceladas: number; total: number }>();
    const sorted = [...reportData.allBookings].sort(
      (a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime()
    );

    sorted.forEach((b) => {
      const key = format(new Date(b.startDatetime), 'dd/MM', { locale: ptBR });
      const entry = map.get(key) || { date: key, confirmadas: 0, pendentes: 0, canceladas: 0, total: 0 };
      const st = b.status.toLowerCase();
      if (st === 'confirmed' || st === 'completed') {
        entry.confirmadas++;
      } else if (st === 'pending') {
        entry.pendentes++;
      } else if (st === 'cancelled') {
        entry.canceladas++;
      }
      entry.total++;
      map.set(key, entry);
    });

    return Array.from(map.values()).slice(-10);
  }, [reportData.allBookings]);

  const bookingsBySpaceData = useMemo(() => {
    const map = new Map<string, { name: string; total: number; confirmadas: number }>();
    reportData.allBookings.forEach((b) => {
      const name = b.space?.name || 'Espaço';
      const entry = map.get(name) || { name, total: 0, confirmadas: 0 };
      entry.total++;
      if (b.status.toLowerCase() === 'confirmed' || b.status.toLowerCase() === 'completed') {
        entry.confirmadas++;
      }
      map.set(name, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 6);
  }, [reportData.allBookings]);

  const bookingsStatusDistribution = useMemo(() => {
    return [
      { name: 'Confirmadas', value: reportData.confirmedBookings + reportData.completedBookings, color: STATUS_COLORS.confirmed },
      { name: 'Pendentes', value: reportData.pendingBookings, color: STATUS_COLORS.pending },
      { name: 'Canceladas', value: reportData.cancelledBookings, color: STATUS_COLORS.cancelled },
    ].filter(item => item.value > 0);
  }, [reportData]);

  // ─── Dados dos Gráficos de Receita ──────────────────────────────────────────

  const revenueTimelineData = useMemo(() => {
    const map = new Map<string, { date: string; receita: number; reservas: number }>();
    const sorted = [...reportData.allBookings].sort(
      (a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime()
    );

    sorted.forEach((b) => {
      const st = b.status.toLowerCase();
      if (st === 'confirmed' || st === 'completed') {
        const key = format(new Date(b.startDatetime), 'dd/MM', { locale: ptBR });
        const entry = map.get(key) || { date: key, receita: 0, reservas: 0 };
        entry.receita += Number(b.totalPrice) || 0;
        entry.reservas++;
        map.set(key, entry);
      }
    });

    return Array.from(map.values()).slice(-10);
  }, [reportData.allBookings]);

  const revenueBySpaceData = useMemo(() => {
    const map = new Map<string, { name: string; receita: number }>();
    reportData.allBookings.forEach((b) => {
      const st = b.status.toLowerCase();
      if (st === 'confirmed' || st === 'completed') {
        const name = b.space?.name || 'Espaço';
        const entry = map.get(name) || { name, receita: 0 };
        entry.receita += Number(b.totalPrice) || 0;
        map.set(name, entry);
      }
    });
    return Array.from(map.values()).sort((a, b) => b.receita - a.receita).slice(0, 6);
  }, [reportData.allBookings]);

  const revenueByPaymentMethodData = useMemo(() => {
    let pix = 0;
    let card = 0;
    reportData.allBookings.forEach((b) => {
      const st = b.status.toLowerCase();
      if (st === 'confirmed' || st === 'completed') {
        const amount = Number(b.totalPrice) || 0;
        if (b.payment?.method === 'PIX') {
          pix += amount;
        } else {
          card += amount;
        }
      }
    });
    return [
      { name: 'PIX', value: pix, color: '#10b981' },
      { name: 'Cartão de Crédito', value: card, color: '#6366f1' },
    ].filter(item => item.value > 0);
  }, [reportData.allBookings]);

  const confirmedCount = reportData.confirmedBookings + reportData.completedBookings;
  const avgTicket = confirmedCount > 0 ? reportData.totalRevenue / confirmedCount : 0;
  const confirmationRate = reportData.totalBookings > 0 
    ? ((confirmedCount / reportData.totalBookings) * 100).toFixed(1) 
    : '0';

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
            <h1 className="text-3xl font-bold tracking-tight">Relatórios & Inteligência</h1>
            <p className="text-muted-foreground">Análises gráficas de reservas, ocupação e métricas financeiras</p>
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Reservas</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.totalBookings}</div>
              <p className="text-xs text-muted-foreground">
                {reportData.pendingBookings} pendentes · {confirmedCount} confirmadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(reportData.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(reportData.monthlyRevenue)} faturados este mês
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{confirmationRate}%</div>
              <p className="text-xs text-muted-foreground">
                Reservas aprovadas / confirmadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Espaços e Anúncios</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.totalSpaces}</div>
              <p className="text-xs text-muted-foreground">
                {reportData.totalUsers} usuários ativos na plataforma
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 max-w-xl">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="bookings">Reservas</TabsTrigger>
            <TabsTrigger value="revenue">Receita</TabsTrigger>
            <TabsTrigger value="feed">Moderação Feed</TabsTrigger>
          </TabsList>

          {/* ─── ABA 1: VISÃO GERAL ────────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Status breakdown progress bars */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="h-4 w-4 text-primary" />
                    Status das Reservas
                  </CardTitle>
                  <CardDescription>Distribuição atual das reservas por situação</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        Confirmadas / Concluídas
                      </span>
                      <span className="font-semibold">{confirmedCount}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${reportData.totalBookings > 0 ? (confirmedCount / reportData.totalBookings) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                        Pendentes
                      </span>
                      <span className="font-semibold">{reportData.pendingBookings}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${reportData.totalBookings > 0 ? (reportData.pendingBookings / reportData.totalBookings) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
                        Canceladas
                      </span>
                      <span className="font-semibold">{reportData.cancelledBookings}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-destructive h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${reportData.totalBookings > 0 ? (reportData.cancelledBookings / reportData.totalBookings) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Reservas Recentes com Miniaturas de Imagens */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="h-4 w-4 text-primary" />
                    Reservas Recentes
                  </CardTitle>
                  <CardDescription>Últimas reservas registradas com fotos dos espaços</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {reportData.recentBookings.map((booking) => {
                      const spaceImg = booking.space ? getSpaceImg(booking.space) : null;
                      const status = booking.status.toLowerCase();

                      return (
                        <div
                          key={booking.id}
                          className="flex items-center justify-between p-3 border rounded-lg gap-3 hover:bg-muted/40 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Space Thumbnail */}
                            <div className="w-12 h-12 shrink-0 rounded-md overflow-hidden border">
                              <SpaceImage
                                src={spaceImg}
                                alt={booking.space?.name || 'Espaço'}
                                containerClassName="w-full h-full bg-muted flex items-center justify-center"
                                iconClassName="h-5 w-5 text-muted-foreground/60"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {booking.space?.name || 'Espaço Excluído'}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {booking.user?.fullName} · {format(new Date(booking.startDatetime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0 flex flex-col items-end gap-1">
                            <span className="text-sm font-bold text-foreground">
                              {formatCurrency(Number(booking.totalPrice))}
                            </span>
                            <Badge
                              variant={
                                status === 'confirmed' ? 'default' :
                                status === 'pending' ? 'secondary' :
                                status === 'completed' ? 'outline' : 'destructive'
                              }
                              className="text-[10px] py-0 px-1.5"
                            >
                              {status === 'confirmed' ? 'Confirmada' :
                               status === 'pending' ? 'Pendente' :
                               status === 'completed' ? 'Realizada' : 'Cancelada'}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}

                    {reportData.recentBookings.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        Nenhuma reserva recente encontrada.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ─── ABA 2: RESERVAS (COM GRÁFICOS) ───────────────────────────── */}
          <TabsContent value="bookings" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Gráfico 1: Volume de Reservas no Tempo */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Fluxo de Reservas por Período
                  </CardTitle>
                  <CardDescription>Volume de agendamentos diários divididos por situação</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] w-full">
                    {bookingsTimelineData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={bookingsTimelineData}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis dataKey="date" fontSize={11} stroke="#888" />
                          <YAxis allowDecimals={false} fontSize={11} stroke="#888" />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', border: 'none', borderRadius: '8px', color: '#fff' }}
                          />
                          <Legend />
                          <Bar dataKey="confirmadas" name="Confirmadas" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="pendentes" name="Pendentes" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="canceladas" name="Canceladas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        Dados insuficientes para renderizar o gráfico temporal.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Gráfico 2: Distribuição por Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <PieChartIcon className="h-4 w-4 text-primary" />
                    Distribuição por Status
                  </CardTitle>
                  <CardDescription>Proporção geral de reservas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] w-full">
                    {bookingsStatusDistribution.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={bookingsStatusDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {bookingsStatusDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', border: 'none', borderRadius: '8px', color: '#fff' }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        Nenhuma reserva cadastrada.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico 3: Espaços mais Reservados */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4 text-primary" />
                  Top Espaços por Demanda
                </CardTitle>
                <CardDescription>Ranking de espaços com mais agendamentos realizados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] w-full">
                  {bookingsBySpaceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={bookingsBySpaceData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis type="number" allowDecimals={false} fontSize={11} stroke="#888" />
                        <YAxis type="category" dataKey="name" width={140} fontSize={11} stroke="#888" />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', border: 'none', borderRadius: '8px', color: '#fff' }}
                        />
                        <Bar dataKey="total" name="Total de Reservas" fill="#6366f1" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      Sem agendamentos registrados para exibir o ranking.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── ABA 3: RECEITA (COM GRÁFICOS) ────────────────────────────── */}
          <TabsContent value="revenue" className="space-y-4">
            {/* Cards de Métricas Financeiras */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Receita Total Faturada</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {formatCurrency(reportData.totalRevenue)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{confirmedCount} reservas confirmadas/concluídas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Ticket Médio por Reserva</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {formatCurrency(avgTicket)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Média por locação confirmada</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Receita Mensal (Mês Atual)</p>
                  <p className="text-2xl font-bold text-primary mt-1">
                    {formatCurrency(reportData.monthlyRevenue)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Faturamento corrente</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Gráfico 1: Evolução da Receita */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    Evolução Financeira (R$)
                  </CardTitle>
                  <CardDescription>Curva de faturamento das reservas confirmadas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] w-full">
                    {revenueTimelineData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueTimelineData}>
                          <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis dataKey="date" fontSize={11} stroke="#888" />
                          <YAxis
                            fontSize={11}
                            stroke="#888"
                            tickFormatter={(val) => `R$${val}`}
                          />
                          <Tooltip
                            formatter={(value: any) => [formatCurrency(Number(value)), 'Faturamento']}
                            contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', border: 'none', borderRadius: '8px', color: '#fff' }}
                          />
                          <Area
                            type="monotone"
                            dataKey="receita"
                            name="Faturamento"
                            stroke="#10b981"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorRevenue)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        Nenhuma receita confirmada registrada no período.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Gráfico 2: Métodos de Pagamento */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Métodos de Pagamento
                  </CardTitle>
                  <CardDescription>Proporção por forma de liquidação</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] w-full">
                    {revenueByPaymentMethodData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={revenueByPaymentMethodData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {revenueByPaymentMethodData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any) => [formatCurrency(Number(value)), 'Valor']}
                            contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', border: 'none', borderRadius: '8px', color: '#fff' }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        Nenhum pagamento registrado.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico 3: Receita por Espaço */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  Receita Gerada por Espaço
                </CardTitle>
                <CardDescription>Espaços mais rentáveis da plataforma</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] w-full">
                  {revenueBySpaceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueBySpaceData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="name" fontSize={11} stroke="#888" />
                        <YAxis
                          fontSize={11}
                          stroke="#888"
                          tickFormatter={(val) => `R$${val}`}
                        />
                        <Tooltip
                          formatter={(value: any) => [formatCurrency(Number(value)), 'Receita']}
                          contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', border: 'none', borderRadius: '8px', color: '#fff' }}
                        />
                        <Bar dataKey="receita" name="Receita (R$)" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      Sem receita registrada por espaço.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── ABA 4: MODERAÇÃO FEED ────────────────────────────────────── */}
          <TabsContent value="feed" className="space-y-4">
            <FeedReportsList />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}