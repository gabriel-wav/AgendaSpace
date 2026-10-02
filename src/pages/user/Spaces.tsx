import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Filter, Building2, MapPin, Users, DollarSign, User2 } from 'lucide-react';
import { fetchSpaces as apiFetchSpaces, Space as ApiSpace } from '@/lib/spaces.api';
import { useToast } from '@/hooks/use-toast';
import { BookingFlowDialog } from '@/components/booking/BookingFlowDialog';

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalMode = 'DETAILS' | 'BOOKING' | null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getImg(space: ApiSpace): string | null {
  return space.imageUrl || (space as any).image_url || null;
}

function getPrice(space: ApiSpace): number {
  return parseFloat(String(space.pricePerHour || (space as any).price_per_hour)) || 0;
}

function getResources(space: ApiSpace): string[] {
  return Array.isArray(space.resources) ? space.resources : [];
}

// ─── SpaceCard ────────────────────────────────────────────────────────────────

interface SpaceCardProps {
  space: ApiSpace;
  onDetails: (space: ApiSpace) => void;
  onBook: (space: ApiSpace) => void;
}

function SpaceCard({ space, onDetails, onBook }: SpaceCardProps) {
  const img = getImg(space);
  const price = getPrice(space);
  const resources = getResources(space);

  const handleCardClick = () => onDetails(space);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onDetails(space);
    }
  };
  const stopAndBook = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBook(space);
  };
  const stopAndDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDetails(space);
  };

  return (
    /* Outer div is the accessible clickable region — not a <button> so inner buttons remain valid */
    <div
      role="article"
      aria-label={`Espaço ${space.name}`}
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
    >
      <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
        {/* Image / placeholder */}
        <div className="h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden">
          {img ? (
            <img src={img} alt={space.name} className="w-full h-full object-cover" />
          ) : (
            <Building2 className="h-16 w-16 text-primary" />
          )}
        </div>

        <CardHeader className="pb-2">
          <CardTitle className="text-lg leading-snug">{space.name}</CardTitle>
          <CardDescription className="line-clamp-2">{space.description}</CardDescription>
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
              <div className="flex flex-wrap gap-1">
                {resources.slice(0, 3).map((r) => (
                  <Badge key={r} variant="outline" className="text-xs">{r}</Badge>
                ))}
                {resources.length > 3 && (
                  <Badge variant="outline" className="text-xs">+{resources.length - 3} mais</Badge>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              {/* These buttons stop propagation so the card click (→ details) is not also triggered */}
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={stopAndDetails}
              >
                Ver Detalhes
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={stopAndBook}
              >
                Reservar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── SpaceDetailsModal ────────────────────────────────────────────────────────

interface SpaceDetailsModalProps {
  space: ApiSpace | null;
  open: boolean;
  onClose: () => void;
  onBook: (space: ApiSpace) => void;
}

function SpaceDetailsModal({ space, open, onClose, onBook }: SpaceDetailsModalProps) {
  if (!space) return null;

  const img = getImg(space);
  const price = getPrice(space);
  const resources = getResources(space);
  const hostName = space.createdBy?.fullName;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="w-[95vw] sm:max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{space.name}</DialogTitle>
          <DialogDescription>Detalhes completos do espaço</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image */}
          <div className="h-56 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center overflow-hidden">
            {img ? (
              <img src={img} alt={space.name} className="w-full h-full object-cover rounded-lg" />
            ) : (
              <Building2 className="h-16 w-16 text-primary" />
            )}
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2 text-sm text-foreground">Informações Gerais</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Capacidade:</span>
                  <span className="font-medium">{space.capacity} pessoas</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Preço por hora:</span>
                  <span className="font-medium text-primary">R$ {price}/h</span>
                </div>
                {hostName && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <User2 className="h-3.5 w-3.5" />
                      Anfitrião:
                    </span>
                    <span className="font-medium">{hostName}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2 text-sm text-foreground">Recursos Disponíveis</h4>
              {resources.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {resources.map((r) => (
                    <Badge key={r} variant="outline" className="text-xs">{r}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhum recurso informado.</p>
              )}
            </div>
          </div>

          {/* Description */}
          {space.description && (
            <div>
              <h4 className="font-medium mb-1 text-sm text-foreground">Descrição</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{space.description}</p>
            </div>
          )}

          {/* CTAs */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="w-full sm:flex-1">
              Fechar
            </Button>
            <Button
              className="w-full sm:flex-1"
              onClick={() => onBook(space)}
            >
              Reservar Agora
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UserSpaces() {
  const [spaces, setSpaces] = useState<ApiSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [capacityRange, setCapacityRange] = useState([1, 100]);
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  const [availableResources, setAvailableResources] = useState<string[]>([]);
  const [maxCapacity, setMaxCapacity] = useState(100);
  const [maxPrice, setMaxPrice] = useState(500);

  // Single source of truth for which space is active and what modal is shown
  const [activeSpace, setActiveSpace] = useState<ApiSpace | null>(null);
  const [mode, setMode] = useState<ModalMode>(null);

  // ── Open details for a space (clears any prior stale state first)
  const openDetails = useCallback((space: ApiSpace) => {
    setActiveSpace(space);
    setMode('DETAILS');
  }, []);

  // ── Open booking flow for a space (skips details)
  const openBooking = useCallback((space: ApiSpace) => {
    setActiveSpace(space);
    setMode('BOOKING');
  }, []);

  // ── Close everything and reset
  const closeAll = useCallback(() => {
    setMode(null);
    // Keep activeSpace briefly so dialog close animation doesn't flash
    // A tiny delay ensures onOpenChange completes before clearing
    setTimeout(() => setActiveSpace(null), 200);
  }, []);

  // ── Transition from details to booking (no race)
  const detailsToBooking = useCallback((space: ApiSpace) => {
    setMode(null); // close details first
    // Next tick — open booking with the same space
    requestAnimationFrame(() => {
      setActiveSpace(space);
      setMode('BOOKING');
    });
  }, []);

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
          if (Array.isArray(s.resources)) s.resources.forEach((r) => resourcesSet.add(r));
        });

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
        title: 'Erro ao carregar espaços',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredSpaces = spaces.filter((space) => {
    const matchesSearch =
      space.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      space.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCapacity =
      space.capacity >= capacityRange[0] && space.capacity <= capacityRange[1];

    const price = getPrice(space);
    const matchesPrice = price >= priceRange[0] && price <= priceRange[1];

    const resources = getResources(space);
    const matchesResource = resourceFilter === 'all' || resources.includes(resourceFilter);

    return matchesSearch && matchesCapacity && matchesPrice && matchesResource;
  });

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
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
          <p className="text-muted-foreground mt-1">Encontre o espaço perfeito para suas necessidades</p>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="spaces-search"
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
                  aria-expanded={showFilters}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filtros
                </Button>
              </div>

              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 border rounded-lg bg-muted/20">
                  <div>
                    <label htmlFor="capacity-slider" className="text-sm font-medium mb-2 block">Capacidade</label>
                    <div className="px-2">
                      <Slider
                        id="capacity-slider"
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
                    <label htmlFor="price-slider" className="text-sm font-medium mb-2 block">Preço por hora</label>
                    <div className="px-2">
                      <Slider
                        id="price-slider"
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
                    <label htmlFor="resource-filter" className="text-sm font-medium mb-2 block">Recursos</label>
                    <Select value={resourceFilter} onValueChange={setResourceFilter}>
                      <SelectTrigger id="resource-filter">
                        <SelectValue placeholder="Selecionar recurso" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os recursos</SelectItem>
                        {availableResources.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
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
            <SpaceCard
              key={space.id}
              space={space}
              onDetails={openDetails}
              onBook={openBooking}
            />
          ))}
        </div>

        {/* Empty state */}
        {filteredSpaces.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum espaço encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Tente alterar os filtros de busca para encontrar outros espaços.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setCapacityRange([1, maxCapacity]);
                  setPriceRange([0, maxPrice]);
                  setResourceFilter('all');
                }}
              >
                Limpar Filtros
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Details modal — only shown when mode === 'DETAILS' */}
        <SpaceDetailsModal
          space={activeSpace}
          open={mode === 'DETAILS'}
          onClose={closeAll}
          onBook={detailsToBooking}
        />

        {/* Booking flow — only shown when mode === 'BOOKING' */}
        <BookingFlowDialog
          space={activeSpace}
          open={mode === 'BOOKING'}
          onOpenChange={(open) => { if (!open) closeAll(); }}
          onCompleted={closeAll}
        />
      </div>
    </AppLayout>
  );
}