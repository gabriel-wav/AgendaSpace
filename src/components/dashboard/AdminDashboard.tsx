import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Calendar, DollarSign, Users, Plus, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

export function AdminDashboard() {
  // Mock data for demonstration
  const stats = {
    totalSpaces: 12,
    todayBookings: 8,
    monthlyRevenue: 15240,
    activeUsers: 45,
  };

  const recentBookings = [
    { id: 1, space: 'Sala de Reunião A', user: 'João Silva', time: '09:00 - 11:00', status: 'confirmed' },
    { id: 2, space: 'Auditório Principal', user: 'Maria Santos', time: '14:00 - 17:00', status: 'pending' },
    { id: 3, space: 'Sala Criativa', user: 'Pedro Costa', time: '10:30 - 12:30', status: 'confirmed' },
  ];

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Espaços</CardTitle>
              <Building2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSpaces}</div>
              <p className="text-xs text-muted-foreground">+2 este mês</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reservas Hoje</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayBookings}</div>
              <p className="text-xs text-muted-foreground">+12% vs ontem</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {stats.monthlyRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+8% vs mês anterior</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeUsers}</div>
              <p className="text-xs text-muted-foreground">+5 novos esta semana</p>
            </CardContent>
          </Card>
        </div>

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
              <div className="space-y-4">
                {recentBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{booking.space}</p>
                      <p className="text-sm text-muted-foreground">{booking.user}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{booking.time}</p>
                      <Badge 
                        variant={booking.status === 'confirmed' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {booking.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
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