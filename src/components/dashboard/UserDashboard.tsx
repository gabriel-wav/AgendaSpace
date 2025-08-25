import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Clock, Search, Plus, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

export function UserDashboard() {
  const { profile } = useAuth();

  // Mock data for demonstration
  const upcomingBookings = [
    { 
      id: 1, 
      space: 'Sala de Reunião A', 
      date: '2024-08-23', 
      time: '09:00 - 11:00', 
      status: 'confirmed',
      capacity: 8,
      resources: ['wifi', 'projetor']
    },
    { 
      id: 2, 
      space: 'Sala Criativa', 
      date: '2024-08-25', 
      time: '14:00 - 16:00', 
      status: 'pending',
      capacity: 6,
      resources: ['wifi', 'quadro-branco']
    },
  ];

  const popularSpaces = [
    { 
      id: 1, 
      name: 'Auditório Principal', 
      capacity: 100, 
      price: 200,
      image: '/api/placeholder/300/200',
      available: true
    },
    { 
      id: 2, 
      name: 'Sala de Treinamento', 
      capacity: 20, 
      price: 80,
      image: '/api/placeholder/300/200',
      available: true
    },
    { 
      id: 3, 
      name: 'Sala de Reunião B', 
      capacity: 12, 
      price: 60,
      image: '/api/placeholder/300/200',
      available: false
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Olá, {profile?.full_name?.split(' ')[0] || 'Usuário'}! 👋
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

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Próximas Reservas</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingBookings.length}</div>
              <p className="text-xs text-muted-foreground">Nos próximos 7 dias</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Espaços Disponíveis</CardTitle>
              <MapPin className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">Para hoje</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Total</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24h</div>
              <p className="text-xs text-muted-foreground">Este mês</p>
            </CardContent>
          </Card>
        </div>

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
            {upcomingBookings.length > 0 ? (
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <h3 className="font-medium">{booking.space}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(booking.date).toLocaleDateString('pt-BR')} • {booking.time}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {booking.capacity} pessoas
                        </span>
                        {booking.resources.map((resource) => (
                          <span key={resource} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            {resource}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={booking.status === 'confirmed' ? 'default' : 'secondary'}
                      >
                        {booking.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                      </Badge>
                      <div className="mt-2">
                        <Button variant="outline" size="sm">
                          Detalhes
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {popularSpaces.map((space) => (
                <div key={space.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Building2 className="h-12 w-12 text-primary" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium mb-2">{space.name}</h3>
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                      <span>{space.capacity} pessoas</span>
                      <span className="font-medium text-foreground">R$ {space.price}/h</span>
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full"
                      disabled={!space.available}
                    >
                      {space.available ? 'Reservar' : 'Indisponível'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}