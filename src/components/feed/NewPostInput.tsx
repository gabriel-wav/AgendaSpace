import React, { useState, useRef, useEffect } from 'react';
import { ImagePlus, Camera as CameraIcon, X, Loader2, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { getAbsoluteImageUrl } from '@/lib/api';
import { Link } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { fetchSpaces } from '@/lib/spaces.api';
import { SpaceImage } from '@/components/spaces/SpaceImage';

interface NewPostInputProps {
  spaces: any[];
  onSubmit: (data: { spaceId: string; content: string; imageFile: File }) => Promise<void>;
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

export function NewPostInput({ spaces, onSubmit }: NewPostInputProps) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState('');
  const [spaceId, setSpaceId] = useState(spaces[0]?.id ?? '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showDesktopCamera, setShowDesktopCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const [openSpace, setOpenSpace] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [spaceOptions, setSpaceOptions] = useState(spaces);
  const [isSearching, setIsSearching] = useState(false);

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  useEffect(() => {
    setSpaceOptions(spaces);
    if (!spaceId && spaces.length > 0) {
      setSpaceId(spaces[0].id);
    }
  }, [spaces]);

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (searchQuery) {
        setIsSearching(true);
        try {
          const res = await fetchSpaces(true, searchQuery);
          setSpaceOptions(res);
        } catch (e) {
          // ignore
        } finally {
          setIsSearching(false);
        }
      } else {
        setSpaceOptions(spaces);
      }
    }, 300);
    return () => clearTimeout(delay);
  }, [searchQuery, spaces]);

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowDesktopCamera(false);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const handleStartDesktopCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Câmera não suportada neste navegador.');
      return;
    }
    setCameraError('');
    setShowDesktopCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      setCameraError('Permissão negada ou câmera ocupada.');
    }
  };

  const handleCaptureDesktop = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
            setImageFile(file);
            setImagePreview(URL.createObjectURL(blob));
            stopCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!content.trim() || !imageFile || !spaceId) return;
    setLoading(true);
    try {
      await onSubmit({ spaceId, content: content.trim(), imageFile });
      setContent('');
      setImageFile(null);
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
      setImagePreview(null);
      setExpanded(false);
    } catch (error) {
      // Error is caught here but form is NOT cleared, allowing retry
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = content.trim().length > 0 && imageFile !== null && spaceId !== '';

  if (spaces.length === 0) {
    return (
      <div className="rounded-md border border-border/60 bg-card px-4 py-6 text-center">
        <p className="text-sm font-medium text-foreground mb-1">
          Nenhum espaço disponível
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          Você precisa ter ou gerenciar um espaço ativo para publicar no feed.
        </p>
        <Link 
          to="/my-spaces" 
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Ir para Meus Espaços
        </Link>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-md border border-border/60 bg-card transition-all duration-200',
        expanded ? 'p-4' : 'px-4 py-3',
      )}
    >
      {/* Collapsed — trigger row */}
      <div className="flex items-center gap-3">
        <Avatar className="h-7 w-7 shrink-0 ring-1 ring-border/60">
          {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.fullName} />}
          <AvatarFallback className="bg-muted text-[11px] font-medium text-muted-foreground">
            {user?.fullName ? initials(user.fullName) : 'U'}
          </AvatarFallback>
        </Avatar>

        <button
          onClick={() => setExpanded(true)}
          className={cn(
            'flex-1 text-left text-sm text-muted-foreground/60',
            'transition-colors duration-150 hover:text-muted-foreground',
          )}
        >
          {expanded ? '' : 'Compartilhe um espaço incrível…'}
        </button>

        {!expanded && (
          <button
            onClick={() => { setExpanded(true); fileInputRef.current?.click(); }}
            className="text-muted-foreground/50 hover:text-muted-foreground transition-colors duration-150"
            aria-label="Adicionar imagem"
          >
            <ImagePlus className="h-4 w-4" strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* Expanded — full form */}
      {expanded && (
        <div className="mt-3 space-y-3 animate-in-up">
          {imagePreview ? (
            <div className="relative rounded-md overflow-hidden bg-muted">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full max-h-72 object-cover"
              />
              <button
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors duration-150"
                aria-label="Remover imagem"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : showDesktopCamera ? (
            <div className="relative rounded-md overflow-hidden bg-black flex flex-col items-center p-4">
              {cameraError ? (
                <div className="text-center text-sm text-red-400 py-6">
                  {cameraError}
                  <button onClick={stopCamera} className="mt-2 block mx-auto text-xs underline text-white">Fechar</button>
                </div>
              ) : (
                <>
                  <video ref={videoRef} autoPlay playsInline className="w-full max-h-72 object-cover bg-black" />
                  <div className="mt-4 flex gap-4">
                    <button onClick={stopCamera} className="px-3 py-1.5 text-xs text-white bg-white/20 rounded hover:bg-white/30">Cancelar</button>
                    <button onClick={handleCaptureDesktop} className="px-4 py-1.5 text-xs text-black font-semibold bg-white rounded-full hover:bg-gray-200">Capturar</button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'rounded-md border border-dashed border-border/60 py-6',
                  'flex flex-col items-center justify-center gap-1.5 text-muted-foreground/50',
                  'hover:border-border hover:text-muted-foreground transition-all duration-150',
                )}
              >
                <ImagePlus className="h-5 w-5" strokeWidth={1.5} />
                <span className="text-xs">Enviar imagem</span>
              </button>
              <button
                onClick={() => isMobile ? cameraInputRef.current?.click() : handleStartDesktopCamera()}
                className={cn(
                  'rounded-md border border-dashed border-border/60 py-6',
                  'flex flex-col items-center justify-center gap-1.5 text-muted-foreground/50',
                  'hover:border-border hover:text-muted-foreground transition-all duration-150',
                )}
              >
                <CameraIcon className="h-5 w-5" strokeWidth={1.5} />
                <span className="text-xs">Usar câmera</span>
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Caption textarea */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escreva algo sobre este espaço…"
            rows={2}
            className={cn(
              'w-full resize-none bg-transparent text-sm text-foreground',
              'placeholder:text-muted-foreground/40',
              'border-0 outline-none ring-0 leading-relaxed',
            )}
          />

          {/* Space selector + actions row */}
          <div className="flex items-center justify-between pt-1 border-t border-border/40">
            <Popover open={openSpace} onOpenChange={setOpenSpace}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 max-w-[200px] text-xs font-medium text-muted-foreground hover:text-foreground">
                  {spaceId ? (() => {
                    const selected = spaceOptions.find(s => s.id === spaceId) || spaces.find(s => s.id === spaceId);
                    if (!selected) return 'Selecionar espaço...';
                    return (
                      <>
                        <SpaceImage
                          src={selected.imageUrl}
                          alt=""
                          containerClassName="w-4 h-4 rounded-sm bg-muted flex items-center justify-center shrink-0"
                          iconClassName="h-2.5 w-2.5 text-muted-foreground"
                          className="w-4 h-4 rounded-sm object-cover shrink-0"
                        />
                        <span className="truncate">{selected.name}</span>
                      </>
                    );
                  })() : 'Selecionar espaço...'}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput placeholder="Buscar espaço..." value={searchQuery} onValueChange={setSearchQuery} />
                  <CommandList>
                    <CommandEmpty>{isSearching ? 'Buscando...' : 'Nenhum espaço encontrado.'}</CommandEmpty>
                    <CommandGroup>
                      {spaceOptions.map(s => (
                        <CommandItem key={s.id} value={s.id} onSelect={() => { setSpaceId(s.id); setOpenSpace(false); }}>
                          <div className="flex items-center gap-2 w-full">
                            <SpaceImage
                              src={s.imageUrl}
                              alt=""
                              containerClassName="w-6 h-6 rounded-sm bg-muted flex items-center justify-center shrink-0"
                              iconClassName="h-3.5 w-3.5 text-muted-foreground"
                              className="w-6 h-6 rounded-sm object-cover shrink-0"
                            />
                            <span className="flex-1 truncate">{s.name}</span>
                            {s.id === spaceId && <Check className="h-4 w-4 shrink-0" />}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <div className="flex items-center gap-2">
              <button
                onClick={() => { setExpanded(false); setContent(''); handleRemoveImage(); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || loading}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium',
                  'bg-foreground text-background',
                  'transition-opacity duration-150',
                  'hover:opacity-85 active:opacity-70',
                  'disabled:cursor-not-allowed disabled:opacity-40',
                )}
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  'Publicar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
