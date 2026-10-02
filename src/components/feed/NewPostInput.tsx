import React, { useState, useRef } from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface NewPostInputProps {
  spaces: { id: string; name: string }[];
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
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = content.trim().length > 0 && imageFile !== null && spaceId !== '';

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
          {/* Image preview / upload zone */}
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
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'w-full rounded-md border border-dashed border-border/60 py-6',
                'flex flex-col items-center gap-1.5 text-muted-foreground/50',
                'hover:border-border hover:text-muted-foreground transition-all duration-150',
              )}
            >
              <ImagePlus className="h-5 w-5" strokeWidth={1.5} />
              <span className="text-xs">Clique para adicionar uma foto (Máx 5MB)</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
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
            <select
              value={spaceId}
              onChange={(e) => setSpaceId(e.target.value)}
              className={cn(
                'bg-transparent text-xs text-muted-foreground',
                'border-0 outline-none ring-0 cursor-pointer',
                'hover:text-foreground transition-colors duration-150',
              )}
            >
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

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
