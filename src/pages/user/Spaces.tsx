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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Space {
  id: string;
  name: string;
  description: string;
  capacity: number;
  price_per_hour: number;
  resources: string[];
  image_url?: string;
  is_active: boolean;
}

export default function UserSpaces() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [capacityRange, setCapacityRange] = useState([1, 100]);
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  const availableResources = ['wifi', 'projetor', 'quadro-branco', 'ar-condicionado', 'som', 'palco', 'computadores'];

  useEffect(() => {
    fetchSpaces();
  }, []);

  const fetchSpaces = async () => {
    try {
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSpaces(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar espaços",
        description: error.message,
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

    const matchesPrice = 
      space.price_per_hour >= priceRange[0] && space.price_per_hour <= priceRange[1];

    const matchesResource = 
      resourceFilter === 'all' || space.resources.includes(resourceFilter);

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
              <div className="flex gap-4">
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
                        max={100}
                        min={1}
                        step={1}
                        className="mb-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{capacityRange[0]} pessoas</span>
                        <span>{capacityRange[1]} pessoas</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Preço por hora</label>
                    <div className="px-2">
                      <Slider
                        value={priceRange}
                        onValueChange={setPriceRange}
                        max={500}
                        min={0}
                        step={10}
                        className="mb-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>R$ {priceRange[0]}</span>
                        <span>R$ {priceRange[1]}</span>
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
          {filteredSpaces.map((space) => (
            <Card key={space.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
              <div className="h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                {space.image_url ? (
                  <img
                    src={space.image_url}
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
                      <span>R$ {space.price_per_hour}/h</span>
                    </div>
                  </div>

                  {space.resources.length > 0 && (
                    <div>
                      <div className="flex flex-wrap gap-1">
                        {space.resources.slice(0, 3).map((resource) => (
                          <Badge key={resource} variant="outline" className="text-xs">
                            {resource}
                          </Badge>
                        ))}
                        {space.resources.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{space.resources.length - 3} mais
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
                    <Button size="sm" className="flex-1">
                      Reservar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
                setCapacityRange([1, 100]);
                setPriceRange([0, 500]);
                setResourceFilter('all');
              }}>
                Limpar Filtros
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Space Details Modal */}
        <Dialog open={!!selectedSpace} onOpenChange={() => setSelectedSpace(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedSpace?.name}</DialogTitle>
              <DialogDescription>
                Detalhes completos do espaço
              </DialogDescription>
            </DialogHeader>
            {selectedSpace && (
              <div className="space-y-4">
                <div className="h-64 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center">
                  {selectedSpace.image_url ? (
                    <img
                      src={selectedSpace.image_url}
                      alt={selectedSpace.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Building2 className="h-16 w-16 text-primary" />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Informações Gerais</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Capacidade:</span>
                        <span>{selectedSpace.capacity} pessoas</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Preço/hora:</span>
                        <span className="font-medium">R$ {selectedSpace.price_per_hour}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Recursos Disponíveis</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedSpace.resources.map((resource) => (
                        <Badge key={resource} variant="outline" className="text-xs">
                          {resource}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {selectedSpace.description && (
                  <div>
                    <h4 className="font-medium mb-2">Descrição</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedSpace.description}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => setSelectedSpace(null)} className="flex-1">
                    Fechar
                  </Button>
                  <Button className="flex-1">
                    Reservar Agora
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}