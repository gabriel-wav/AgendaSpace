import React, { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { getAbsoluteImageUrl } from '@/lib/api';

export interface SpaceImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  containerClassName?: string;
  iconClassName?: string;
}

export function SpaceImage({
  src,
  alt = 'Espaço',
  className = 'w-full h-full object-cover',
  containerClassName = 'w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5',
  iconClassName = 'h-10 w-10 text-primary',
}: SpaceImageProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const fullUrl = getAbsoluteImageUrl(src);

  if (!fullUrl || hasError) {
    return (
      <div className={containerClassName}>
        <Building2 className={iconClassName} />
      </div>
    );
  }

  return (
    <img
      src={fullUrl}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
    />
  );
}
