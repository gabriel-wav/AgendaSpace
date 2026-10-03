import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, DollarSign } from 'lucide-react';
import { Space as ApiSpace } from '@/lib/spaces.api';
import { getAbsoluteImageUrl } from '@/lib/api';
import { SpaceImage } from '@/components/spaces/SpaceImage';

export function getSpaceImg(space: ApiSpace | any): string | null {
  const raw = space?.images?.[0]?.url || space?.imageUrl || (space as any)?.image_url || null;
  return raw ? getAbsoluteImageUrl(raw) ?? null : null;
}

export function getSpacePrice(space: ApiSpace | any): number {
  return parseFloat(String(space?.pricePerHour || (space as any)?.price_per_hour)) || 0;
}

export function getSpaceResources(space: ApiSpace | any): string[] {
  return Array.isArray(space?.resources) ? space.resources : [];
}

export interface SpaceCardProps {
  space: ApiSpace | any;
  onDetails: (space: ApiSpace | any) => void;
  onBook: (space: ApiSpace | any) => void;
}

export function SpaceCard({ space, onDetails, onBook }: SpaceCardProps) {
  const img = getSpaceImg(space);
  const price = getSpacePrice(space);
  const resources = getSpaceResources(space);
  const [imgError, setImgError] = React.useState(false);

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
      className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg h-full"
    >
      <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col justify-between">
        <div>
          {/* Image / placeholder */}
          <div className="h-48 overflow-hidden">
            <SpaceImage
              src={img}
              alt={space.name}
              className="w-full h-full object-cover"
              containerClassName="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center"
              iconClassName="h-16 w-16 text-primary"
            />
          </div>

          <CardHeader className="pb-2">
            <CardTitle className="text-lg leading-snug">{space.name}</CardTitle>
            <CardDescription className="line-clamp-2">{space.description}</CardDescription>
          </CardHeader>
        </div>

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
                {resources.slice(0, 3).map((r: string) => (
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
