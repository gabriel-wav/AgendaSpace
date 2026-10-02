import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Calendar, DollarSign, Users, Plus, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { fetchAdminStats } from '@/lib/dashboard.api';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function AdminDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSpaces: 0,
    todayBookings: 0,
    monthlyRevenue: 0,
    activeUsers: 0,
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchAdminStats();

        setStats({
          totalSpaces: data.totalSpaces,
          todayBookings: data.todayBookings,
          monthlyRevenue: Number(data.monthlyRevenue) || 0,
          activeUsers: data.activeUsers,
        });

        setRecentBookings(data.recentBookings || []);
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

    fetchData();
  }, [toast]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard Administrativo</h1>
            <p className="text-muted-foreground mt-1">
              Visão geral da gestão de espaços e reservas
            </p>
          </div>
          <Link to="/admin/spaces">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Espaço
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 bg-muted rounded animate-pulse"></div>
                  <div className="h-4 w-4 bg-muted rounded animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded animate-pulse mb-2"></div>
                  <div className="h-3 bg-muted rounded animate-pulse w-20"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Espaços</CardTitle>
                <Building2 className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSpaces}</div>
                <p className="text-xs text-muted-foreground">Cadastrados e ativos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reservas Hoje</CardTitle>
                <Calendar className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.todayBookings}</div>
                <p className="text-xs text-muted-foreground">Agendadas para hoje</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita Mensal (Simulada)</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ {stats.monthlyRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <p className="text-xs text-muted-foreground">Reservas pagas via PIX/Cartão</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuários Cadastrados</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeUsers}</div>
                <p className="text-xs text-muted-foreground">Total na plataforma</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5 text-primary" />
                Reservas Recentes
              </CardTitle>
              <CardDescription>
                Últimas reservas realizadas na plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded animate-pulse mb-2"></div>
                        <div className="h-3 bg-muted rounded animate-pulse w-24"></div>
                      </div>
                      <div className="text-right">
                        <div className="h-4 bg-muted rounded animate-pulse mb-1 w-16"></div>
                        <div className="h-5 bg-muted rounded animate-pulse w-20"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentBookings.length > 0 ? (
                <div className="space-y-4">
                  {recentBookings.map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{booking.space?.name || booking.spaces?.name || 'Espaço'}</p>
                        <p className="text-sm text-muted-foreground">{booking.user?.fullName || booking.profiles?.full_name || 'Usuário'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {format(new Date(booking.startDatetime || booking.start_datetime), "HH:mm", { locale: ptBR })} - {format(new Date(booking.endDatetime || booking.end_datetime), "HH:mm", { locale: ptBR })}
                        </p>
                        <Badge 
                          variant={String(booking.status).toUpperCase() === 'CONFIRMED' ? 'default' : String(booking.status).toUpperCase() === 'PENDING' ? 'secondary' : 'outline'}
                          className="text-xs"
                        >
                          {String(booking.status).toUpperCase() === 'CONFIRMED' ? 'Confirmado' : 
                           String(booking.status).toUpperCase() === 'PENDING' ? 'Pendente' : 
                           String(booking.status).toUpperCase() === 'COMPLETED' ? 'Realizado' : 'Cancelado'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Calendar className="mx-auto h-8 w-8 mb-2" />
                  <p>Nenhuma reserva recente</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-primary" />
                Desempenho
              </CardTitle>
              <CardDescription>
                Estatísticas de ocupação e performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Taxa de Ocupação</span>
                  <span className="font-medium">78%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full w-[78%]"></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Satisfação do Cliente</span>
                  <span className="font-medium">4.8/5</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-success h-2 rounded-full w-[96%]"></div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Crescimento Mensal</span>
                  <span className="font-medium text-success">+15%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-success h-2 rounded-full w-[60%]"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Acesso rápido às principais funcionalidades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link to="/admin/spaces">
                <Button variant="outline" className="h-20 flex-col gap-2 w-full">
                  <Building2 className="h-6 w-6" />
                  Gerenciar Espaços
                </Button>
              </Link>
              <Link to="/admin/bookings">
                <Button variant="outline" className="h-20 flex-col gap-2 w-full">
                  <Calendar className="h-6 w-6" />
                  Ver Agenda
                </Button>
              </Link>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <Users className="h-6 w-6" />
                Gerenciar Usuários
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}