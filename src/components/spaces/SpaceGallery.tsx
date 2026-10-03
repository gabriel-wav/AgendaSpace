import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  CarouselApi,
} from '@/components/ui/carousel';
import { Building2, Maximize2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAbsoluteImageUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';
import { SpaceImage } from '@/components/spaces/SpaceImage';

interface SpaceGalleryProps {
  images?: { id: string; url: string; position?: number }[];
  fallbackUrl?: string | null;
  spaceName: string;
}

export function SpaceGallery({ images = [], fallbackUrl, spaceName }: SpaceGalleryProps) {
  // Normalize images
  let sortedImages = [...images].sort((a, b) => (a.position || 0) - (b.position || 0));
  
  if (sortedImages.length === 0 && fallbackUrl) {
    sortedImages = [{ id: 'fallback', url: fallbackUrl }];
  }

  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!api) return;
    const updateCurrent = () => setCurrent(api.selectedScrollSnap());
    api.on('select', updateCurrent);
    updateCurrent();
  }, [api]);

  const openFullscreen = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setFullscreenIndex(index);
    setIsFullscreen(true);
    
    // Attempt real fullscreen if supported
    if (containerRef.current && containerRef.current.requestFullscreen) {
      containerRef.current.requestFullscreen().catch(() => {
        // Ignore fullscreen error, fallback to overlay
      });
    }
  };

  const closeFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setIsFullscreen(false);
  }, []);

  // Sync fullscreen exit via native ESC
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isFullscreen]);

  // Keyboard navigation for fullscreen overlay
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeFullscreen();
      } else if (e.key === 'ArrowRight') {
        setFullscreenIndex((prev) => (prev + 1) % sortedImages.length);
      } else if (e.key === 'ArrowLeft') {
        setFullscreenIndex((prev) => (prev - 1 + sortedImages.length) % sortedImages.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, sortedImages.length, closeFullscreen]);

  if (sortedImages.length === 0) {
    return (
      <div className="h-56 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center overflow-hidden">
        <Building2 className="h-16 w-16 text-primary" />
      </div>
    );
  }

  const renderFullscreenViewer = () => {
    if (!isFullscreen) return null;
    
    return createPortal(
      <div 
        ref={containerRef}
        className="fixed inset-0 z-[9999] bg-black/95 flex flex-col backdrop-blur-sm"
        onClick={(e) => {
          e.stopPropagation();
        }}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-10">
          <div className="text-white font-medium drop-shadow-md">
            {spaceName} <span className="text-white/60 text-sm font-normal ml-2">{fullscreenIndex + 1} / {sortedImages.length}</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              closeFullscreen();
            }}
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Image Display */}
        <div className="flex-1 flex items-center justify-center relative p-4 sm:p-12">
          {sortedImages.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 sm:left-4 text-white hover:bg-white/20 rounded-full h-10 w-10 sm:h-14 sm:w-14 z-10"
              onClick={(e) => {
                e.stopPropagation();
                setFullscreenIndex((prev) => (prev - 1 + sortedImages.length) % sortedImages.length);
              }}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
          )}

          <SpaceImage 
            src={sortedImages[fullscreenIndex].url} 
            alt={`${spaceName} - Foto ${fullscreenIndex + 1}`} 
            className="max-h-full max-w-full object-contain"
            containerClassName="w-full h-full flex items-center justify-center"
            iconClassName="h-24 w-24 text-white/50"
          />

          {sortedImages.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 sm:right-4 text-white hover:bg-white/20 rounded-full h-10 w-10 sm:h-14 sm:w-14 z-10"
              onClick={(e) => {
                e.stopPropagation();
                setFullscreenIndex((prev) => (prev + 1) % sortedImages.length);
              }}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          )}
        </div>
      </div>,
      document.body
    );
  };

  return (
    <>
      <div className="relative group rounded-lg overflow-hidden h-56 bg-gradient-to-br from-primary/20 to-primary/5">
        {sortedImages.length === 1 ? (
          <div 
            className="w-full h-full relative cursor-pointer"
            onClick={(e) => openFullscreen(e, 0)}
          >
            <SpaceImage 
              src={sortedImages[0].url} 
              alt={spaceName} 
              className="w-full h-full object-cover"
              containerClassName="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center"
              iconClassName="h-16 w-16 text-primary"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <Maximize2 className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 drop-shadow-md transition-opacity" />
            </div>
          </div>
        ) : (
          <Carousel setApi={setApi} className="w-full h-full">
            <CarouselContent className="h-full ml-0">
              {sortedImages.map((img, idx) => (
                <CarouselItem key={img.id} className="pl-0 h-full relative cursor-pointer" onClick={(e) => openFullscreen(e, idx)}>
                  <SpaceImage 
                    src={img.url} 
                    alt={`${spaceName} - Foto ${idx + 1}`} 
                    className="w-full h-full object-cover"
                    containerClassName="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center"
                    iconClassName="h-16 w-16 text-primary"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <Maximize2 className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 drop-shadow-md transition-opacity" />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            
            {/* Carousel Controls */}
            <CarouselPrevious 
              className="left-2 bg-white/80 hover:bg-white border-none shadow-md opacity-0 group-hover:opacity-100 transition-opacity disabled:hidden" 
              onClick={(e) => {
                e.stopPropagation();
                api?.scrollPrev();
              }}
            />
            <CarouselNext 
              className="right-2 bg-white/80 hover:bg-white border-none shadow-md opacity-0 group-hover:opacity-100 transition-opacity disabled:hidden" 
              onClick={(e) => {
                e.stopPropagation();
                api?.scrollNext();
              }}
            />

            {/* Dots */}
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
              {sortedImages.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all shadow-sm",
                    current === idx ? "bg-white w-3" : "bg-white/50 hover:bg-white/80"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    api?.scrollTo(idx);
                  }}
                />
              ))}
            </div>
          </Carousel>
        )}
      </div>

      {renderFullscreenViewer()}
    </>
  );
}
