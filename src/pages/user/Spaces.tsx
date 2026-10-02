import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Filter, Building2, MapPin, Users, DollarSign } from 'lucide-react';
import { fetchSpaces as apiFetchSpaces, Space as ApiSpace } from '@/lib/spaces.api';
import { useToast } from '@/hooks/use-toast';
import { BookingForm } from '@/components/booking/BookingForm';

export default function UserSpaces() {
  const [spaces, setSpaces] = useState<ApiSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [capacityRange, setCapacityRange] = useState([1, 100]);
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  const [selectedSpace, setSelectedSpace] = useState<ApiSpace | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const { toast } = useToast();

  const [availableResources, setAvailableResources] = useState<string[]>([]);
  const [maxCapacity, setMaxCapacity] = useState(100);
  const [maxPrice, setMaxPrice] = useState(500);

  useEffect(() => {
    loadSpaces();
  }, []);

  const loadSpaces = async () => {
    try {
      const data = await apiFetchSpaces(true);
      const loadedSpaces = data || [];
      setSpaces(loadedSpaces);

      if (loadedSpaces.length > 0) {
        let currentMaxCapacity = 1;
        let currentMaxPrice = 0;
        const resourcesSet = new Set<string>();

        loadedSpaces.forEach((s) => {
          if (s.capacity > currentMaxCapacity) currentMaxCapacity = s.capacity;
          const p = parseFloat(String(s.pricePerHour || (s as any).price_per_hour)) || 0;
          if (p > currentMaxPrice) currentMaxPrice = p;
          if (Array.isArray(s.resources)) {
            s.resources.forEach((r) => resourcesSet.add(r));
          }
        });

        // Add 10% margin to max price, ceil it
        const finalMaxPrice = Math.ceil(currentMaxPrice * 1.1) || 500;
        const finalMaxCapacity = currentMaxCapacity > 1 ? currentMaxCapacity : 100;

        setMaxCapacity(finalMaxCapacity);
        setMaxPrice(finalMaxPrice);
        setCapacityRange([1, finalMaxCapacity]);
        setPriceRange([0, finalMaxPrice]);
        setAvailableResources(Array.from(resourcesSet).sort());
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar espaços",
        description: error.response?.data?.message || error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredSpaces = spaces.filter(space => {
    const matchesSearch = 
      space.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      space.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCapacity = 
      space.capacity >= capacityRange[0] && space.capacity <= capacityRange[1];

    const price = parseFloat(String(space.pricePerHour || (space as any).price_per_hour)) || 0;
    const matchesPrice = price >= priceRange[0] && price <= priceRange[1];

    const resources = Array.isArray(space.resources) ? space.resources : [];
    const matchesResource = 
      resourceFilter === 'all' || resources.includes(resourceFilter);

    return matchesSearch && matchesCapacity && matchesPrice && matchesResource;
  });

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando espaços...</p>
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
          <h1 className="text-3xl font-bold text-foreground">Explorar Espaços</h1>
          <p className="text-muted-foreground mt-1">
            Encontre o espaço perfeito para suas necessidades
          </p>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar espaços..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="w-full sm:w-auto"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filtros
                </Button>
              </div>

              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 border rounded-lg bg-muted/20">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Capacidade</label>
                    <div className="px-2">
                      <Slider
                        value={capacityRange}
                        onValueChange={setCapacityRange}
                        max={maxCapacity}
                        min={1}
                        step={1}
                        className="mb-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{capacityRange[0]} pessoas</span>
                        <span>{capacityRange[1]}{capacityRange[1] === maxCapacity ? '+' : ''} pessoas</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Preço por hora</label>
                    <div className="px-2">
                      <Slider
                        value={priceRange}
                        onValueChange={setPriceRange}
                        max={maxPrice}
                        min={0}
                        step={10}
                        className="mb-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>R$ {priceRange[0]}</span>
                        <span>R$ {priceRange[1]}{priceRange[1] === maxPrice ? '+' : ''}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Recursos</label>
                    <Select value={resourceFilter} onValueChange={setResourceFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar recurso" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os recursos</SelectItem>
                        {availableResources.map((resource) => (
                          <SelectItem key={resource} value={resource}>
                            {resource}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            {filteredSpaces.length} espaço{filteredSpaces.length !== 1 ? 's' : ''} encontrado{filteredSpaces.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Spaces Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSpaces.map((space) => {
            const img = space.imageUrl || (space as any).image_url;
            const price = parseFloat(String(space.pricePerHour || (space as any).price_per_hour)) || 0;
            const resources = Array.isArray(space.resources) ? space.resources : [];

            return (
              <Card key={space.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
                <div className="h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  {img ? (
                    <img
                      src={img}
                      alt={space.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2 className="h-16 w-16 text-primary" />
                  )}
                </div>
                <CardHeader>
                  <CardTitle className="text-lg">{space.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {space.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{space.capacity} pessoas</span>
                      </div>
                      <div className="flex items-center gap-1 text-lg font-bold">
                        <DollarSign className="h-4 w-4" />
                        <span>R$ {price}/h</span>
                      </div>
                    </div>

                    {resources.length > 0 && (
                      <div>
                        <div className="flex flex-wrap gap-1">
                          {resources.slice(0, 3).map((resource) => (
                            <Badge key={resource} variant="outline" className="text-xs">
                              {resource}
                            </Badge>
                          ))}
                          {resources.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{resources.length - 3} mais
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSpace(space)}
                      className="flex-1"
                    >
                      Ver Detalhes
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setSelectedSpace(space);
                        setShowBookingForm(true);
                      }}
                    >
                      Reservar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        </div>

        {filteredSpaces.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum espaço encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Tente alterar os filtros de busca para encontrar outros espaços.
              </p>
              <Button variant="outline" onClick={() => {
                setSearchTerm('');
                setCapacityRange([1, maxCapacity]);
                setPriceRange([0, maxPrice]);
                setResourceFilter('all');
              }}>
                Limpar Filtros
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Space Details Modal */}
        <Dialog open={!!selectedSpace && !showBookingForm} onOpenChange={(open) => {
          if (!open) setSelectedSpace(null);
        }}>
          <DialogContent className="w-[95vw] sm:max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-xl">{selectedSpace?.name}</DialogTitle>
              <DialogDescription>
                Detalhes completos do espaço
              </DialogDescription>
            </DialogHeader>
            {selectedSpace && (
              <div className="space-y-4">
                <div className="h-56 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center overflow-hidden">
                  {(selectedSpace.imageUrl || (selectedSpace as any).image_url) ? (
                    <img
                      src={selectedSpace.imageUrl || (selectedSpace as any).image_url}
                      alt={selectedSpace.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Building2 className="h-16 w-16 text-primary" />
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2 text-sm text-foreground">Informações Gerais</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Capacidade:</span>
                        <span className="font-medium">{selectedSpace.capacity} pessoas</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Preço por hora:</span>
                        <span className="font-medium text-primary">
                          R$ {parseFloat(String(selectedSpace.pricePerHour || (selectedSpace as any).price_per_hour)) || 0}/h
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2 text-sm text-foreground">Recursos Disponíveis</h4>
                    <div className="flex flex-wrap gap-1">
                      {(Array.isArray(selectedSpace.resources) ? selectedSpace.resources : []).map((resource) => (
                        <Badge key={resource} variant="outline" className="text-xs">
                          {resource}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {selectedSpace.description && (
                  <div>
                    <h4 className="font-medium mb-1 text-sm text-foreground">Descrição</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedSpace.description}
                    </p>
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4">
                  <Button variant="outline" onClick={() => setSelectedSpace(null)} className="w-full sm:flex-1">
                    Fechar
                  </Button>
                  <Button 
                    className="w-full sm:flex-1"
                    onClick={() => setShowBookingForm(true)}
                  >
                    Reservar Agora
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Booking Form Modal */}
        <Dialog open={showBookingForm} onOpenChange={(open) => {
          setShowBookingForm(open);
          if (!open) setSelectedSpace(null);
        }}>
          <DialogContent className="w-[95vw] sm:max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-xl">
            {selectedSpace && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Reservar {selectedSpace.name}
                  </DialogTitle>
                  <DialogDescription>
                    Escolha a data e o período desejado para solicitar a sua reserva.
                  </DialogDescription>
                </DialogHeader>
                <BookingForm
                  space={selectedSpace}
                  onSuccess={() => {
                    setShowBookingForm(false);
                    setSelectedSpace(null);
                  }}
                  onCancel={() => {
                    setShowBookingForm(false);
                  }}
                />
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}