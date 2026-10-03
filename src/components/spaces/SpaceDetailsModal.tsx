import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { User2 } from 'lucide-react';
import { Space as ApiSpace } from '@/lib/spaces.api';
import { SpaceGallery } from '@/components/spaces/SpaceGallery';
import { getSpaceImg, getSpacePrice, getSpaceResources } from '@/components/spaces/SpaceCard';

export interface SpaceDetailsModalProps {
  space: ApiSpace | any | null;
  open: boolean;
  onClose: () => void;
  onBook: (space: ApiSpace | any) => void;
}

export function SpaceDetailsModal({ space, open, onClose, onBook }: SpaceDetailsModalProps) {
  if (!space) return null;

  const img = getSpaceImg(space);
  const price = getSpacePrice(space);
  const resources = getSpaceResources(space);
  const hostName = space.createdBy?.fullName;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="w-[95vw] sm:max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{space.name}</DialogTitle>
          <DialogDescription>Detalhes completos do espaço</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <SpaceGallery 
            images={space.images} 
            fallbackUrl={img} 
            spaceName={space.name} 
          />

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
                  {resources.map((r: string) => (
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
