import React, { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useFileUpload } from '@/hooks/useFileUpload';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Building2,
  ImagePlus,
  X,
  Loader2,
  Users,
  Banknote,
  Link as LinkIcon,
} from 'lucide-react';
import {
  Space,
  CreateSpacePayload,
  fetchSpaces as apiFetchSpaces,
  fetchMySpaces,
  createSpace,
  updateSpace,
  deleteSpace,
} from '@/lib/spaces.api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

// ─── Primitives ─────────────────────────────────────────────────────────────

/** Dot badge — green/red, no filled block */
function StatusDot({ active }: { active: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className={cn(
          'inline-block h-1.5 w-1.5 rounded-full',
          active ? 'bg-success' : 'bg-muted-foreground/40'
        )}
      />
      {active ? 'Ativo' : 'Inativo'}
    </span>
  );
}

/** Square thumbnail with fallback icon */
function SpaceThumbnail({ imageUrl, name }: { imageUrl?: string; name: string }) {
  if (imageUrl) {
    return (
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border/60 bg-muted">
        <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted">
      <Building2 className="h-4 w-4 text-muted-foreground/50" strokeWidth={1.5} />
    </div>
  );
}

/** Flushed input */
const inputCls = cn(
  'w-full rounded-md bg-zinc-100 dark:bg-zinc-900 px-3 py-2 text-sm text-foreground',
  'placeholder:text-muted-foreground/40 border-0 outline-none',
  'ring-1 ring-transparent focus:ring-ring transition-all duration-150'
);

/** Flushed label */
function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1.5"
    >
      {children}
    </label>
  );
}

// ─── SpaceSheet (create / edit) ─────────────────────────────────────────────

interface SpaceSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Space | null;
  onSaved: () => void;
}

function SpaceSheet({ open, onOpenChange, editing, onSaved }: SpaceSheetProps) {
  const { toast } = useToast();
  const { uploadFile, uploading } = useFileUpload();
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    capacity: '',
    price_per_hour: '',
    resources: '',
    image_url: '',
    is_active: true,
  });

  // Populate when editing changes
  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        description: editing.description ?? '',
        capacity: String(editing.capacity),
        price_per_hour: String(editing.pricePerHour),
        resources: Array.isArray(editing.resources) ? editing.resources.join(', ') : '',
        image_url: editing.imageUrl ?? '',
        is_active: editing.isActive,
      });
      setImagePreview(editing.imageUrl ?? null);
    } else {
      setForm({
        name: '',
        description: '',
        capacity: '',
        price_per_hour: '',
        resources: '',
        image_url: '',
        is_active: true,
      });
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
      setImagePreview(null);
    }
    setImageFile(null);
  }, [editing, open]);

  const field = (key: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let finalImageUrl = form.image_url.trim() || undefined;

      if (imageFile) {
        const uploadedUrl = await uploadFile(imageFile, 'spaces');
        if (!uploadedUrl) {
          // hook já mostra toast de erro
          setSaving(false);
          return;
        }
        finalImageUrl = uploadedUrl;
      }

      const capacity = parseInt(form.capacity, 10);
      const price = parseFloat(form.price_per_hour);

      if (isNaN(capacity) || capacity < 1) {
        throw new Error('A capacidade deve ser um número inteiro válido maior que 0.');
      }
      if (isNaN(price) || price < 0) {
        throw new Error('O preço por hora deve ser um valor numérico válido.');
      }

      const payload: CreateSpacePayload = {
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
        capacity,
        pricePerHour: price,
        resources: form.resources
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean),
        imageUrl: finalImageUrl,
        isActive: form.is_active,
      };

      if (editing) {
        await updateSpace(editing.id, payload);
        toast({ title: 'Espaço atualizado com sucesso.' });
      } else {
        await createSpace(payload);
        toast({ title: 'Espaço criado com sucesso.' });
      }

      onSaved();
      onOpenChange(false);
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    } catch (err: any) {
      const message = err.response?.data?.message
        ? Array.isArray(err.response.data.message)
          ? err.response.data.message.join(', ')
          : err.response.data.message
        : err.message || 'Erro ao salvar espaço';
      toast({ title: 'Erro ao salvar', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md overflow-y-auto border-l border-border/60 bg-background p-0"
      >
        {/* Sheet header */}
        <SheetHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/60 px-6 py-4">
          <SheetTitle className="text-base font-semibold tracking-tight">
            {editing ? 'Editar espaço' : 'Novo espaço'}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {editing
              ? 'Altere os dados do espaço abaixo.'
              : 'Preencha os dados para cadastrar um novo espaço.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 py-6">
          {/* Image upload / URL */}
          <div>
            <FieldLabel htmlFor="image">Imagem do Espaço</FieldLabel>
            {imagePreview ? (
              <div className="relative overflow-hidden rounded-md border border-border/60 bg-muted mb-2">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-40 object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    if (imagePreview && imagePreview.startsWith('blob:')) {
                      URL.revokeObjectURL(imagePreview);
                    }
                    setImagePreview(null);
                    setForm((f) => ({ ...f, image_url: '' }));
                  }}
                  className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-md border border-dashed border-border/60 py-5 text-muted-foreground/60 hover:border-border hover:text-muted-foreground transition-all duration-150 mb-2"
              >
                <ImagePlus className="h-5 w-5" strokeWidth={1.5} />
                <span className="text-xs">Clique para selecionar imagem local</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />

            <div className="relative">
              <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
              <input
                className={cn(inputCls, 'pl-8 text-xs')}
                placeholder="Ou cole uma URL de imagem (https://...)"
                value={form.image_url}
                onChange={(e) => {
                  field('image_url')(e.target.value);
                  if (e.target.value) {
                    setImagePreview(e.target.value);
                  }
                }}
              />
            </div>
          </div>

          {/* Name */}
          <div>
            <FieldLabel htmlFor="name">Nome do espaço</FieldLabel>
            <input
              id="name"
              className={inputCls}
              value={form.name}
              onChange={(e) => field('name')(e.target.value)}
              placeholder="Ex: Sala de Reuniões Premium"
              required
            />
          </div>

          {/* Description */}
          <div>
            <FieldLabel htmlFor="description">Descrição</FieldLabel>
            <textarea
              id="description"
              className={cn(inputCls, 'resize-none leading-relaxed')}
              rows={3}
              value={form.description}
              onChange={(e) => field('description')(e.target.value)}
              placeholder="Descreva o espaço brevemente…"
            />
          </div>

          {/* Capacity + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="capacity">Capacidade</FieldLabel>
              <input
                id="capacity"
                type="number"
                min={1}
                className={inputCls}
                value={form.capacity}
                onChange={(e) => field('capacity')(e.target.value)}
                placeholder="Ex: 20"
                required
              />
            </div>
            <div>
              <FieldLabel htmlFor="price">Preço/hora (R$)</FieldLabel>
              <input
                id="price"
                type="number"
                step="0.01"
                min={0}
                className={inputCls}
                value={form.price_per_hour}
                onChange={(e) => field('price_per_hour')(e.target.value)}
                placeholder="Ex: 150.00"
                required
              />
            </div>
          </div>

          {/* Resources */}
          <div>
            <FieldLabel htmlFor="resources">Recursos</FieldLabel>
            <input
              id="resources"
              className={inputCls}
              value={form.resources}
              onChange={(e) => field('resources')(e.target.value)}
              placeholder="Wi-Fi, Projetor, Ar-condicionado, Quadro branco"
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground/50">
              Separe os recursos por vírgula.
            </p>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/30 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Espaço ativo</p>
              <p className="text-xs text-muted-foreground">Disponível para reservas</p>
            </div>
            <Switch
              id="is_active"
              checked={form.is_active}
              onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/40">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-md py-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className={cn(
                'flex-1 rounded-md py-2 text-sm font-medium',
                'bg-foreground text-background',
                'transition-opacity duration-150 hover:opacity-85 active:opacity-70',
                'disabled:cursor-not-allowed disabled:opacity-40',
              )}
            >
              {(saving || uploading) ? (
                <span className="inline-flex items-center gap-2 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando…
                </span>
              ) : (
                editing ? 'Salvar alterações' : 'Criar espaço'
              )}
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ─── SpaceRow ────────────────────────────────────────────────────────────────

interface SpaceRowProps {
  space: Space;
  onEdit: (s: Space) => void;
  onDelete: (id: string) => void;
  onToggleActive: (s: Space) => void;
}

function SpaceRow({ space, onEdit, onDelete, onToggleActive }: SpaceRowProps) {
  const resources = Array.isArray(space.resources) ? space.resources : [];

  return (
    <div className="group flex items-center gap-4 border-b border-zinc-200/50 dark:border-zinc-800/50 px-4 py-4 transition-colors duration-100 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
      {/* Thumbnail */}
      <SpaceThumbnail imageUrl={space.imageUrl ?? undefined} name={space.name} />

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">{space.name}</span>
          <StatusDot active={space.isActive} />
        </div>
        {space.description && (
          <p className="mt-0.5 text-xs text-muted-foreground truncate max-w-sm">
            {space.description}
          </p>
        )}
        {resources.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {resources.slice(0, 4).map((r) => (
              <span
                key={r}
                className="inline-block rounded border border-border/60 px-1.5 py-px text-[10px] text-muted-foreground"
              >
                {r}
              </span>
            ))}
            {resources.length > 4 && (
              <span className="text-[10px] text-muted-foreground/50">
                +{resources.length - 4} mais
              </span>
            )}
          </div>
        )}
      </div>

      {/* Meta columns */}
      <div className="hidden sm:flex items-center gap-6 shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span>{space.capacity}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Banknote className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span>
            {Number(space.pricePerHour).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
            <span className="text-muted-foreground/50">/h</span>
          </span>
        </div>
      </div>

      {/* Actions — 3-dot menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground/40 opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-muted transition-all duration-100 outline-none"
            aria-label="Ações do espaço"
          >
            <MoreVertical className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44 animate-in-up" sideOffset={4}>
          <DropdownMenuItem
            className="gap-2 text-sm cursor-pointer"
            onClick={() => onEdit(space)}
          >
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2 text-sm cursor-pointer"
            onClick={() => onToggleActive(space)}
          >
            <span
              className={cn(
                'h-3.5 w-3.5 rounded-full border',
                space.isActive ? 'border-muted-foreground/40' : 'bg-success border-success'
              )}
            />
            {space.isActive ? 'Desativar' : 'Ativar'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2 text-sm cursor-pointer text-destructive focus:text-destructive"
            onClick={() => onDelete(space.id)}
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─── Column header row ───────────────────────────────────────────────────────

function ListHeader() {
  return (
    <div className="flex items-center gap-4 border-b border-border/60 px-4 py-2">
      <div className="h-10 w-10 shrink-0" />
      <div className="flex-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/50">
        Espaço
      </div>
      <div className="hidden sm:flex items-center gap-6 shrink-0">
        <span className="w-10 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/50 text-right">
          Cap.
        </span>
        <span className="w-20 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/50 text-right">
          Preço/h
        </span>
      </div>
      <div className="h-8 w-8 shrink-0" />
    </div>
  );
}

// ─── Skeleton row ────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 border-b border-zinc-200/50 dark:border-zinc-800/50 px-4 py-4">
      <div className="h-10 w-10 shrink-0 rounded-md bg-muted animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-32 rounded bg-muted animate-pulse" />
        <div className="h-2.5 w-48 rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminSpaces({ mode = 'admin' }: { mode?: 'admin' | 'host' }) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Space | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  const loadSpaces = async () => {
    setLoading(true);
    try {
      const data = mode === 'host' ? await fetchMySpaces() : await apiFetchSpaces(false);
      setSpaces(data ?? []);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Erro ao carregar espaços';
      toast({ title: 'Erro ao carregar espaços', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSpaces();
  }, [mode]);

  const openCreate = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const openEdit = (space: Space) => {
    setEditing(space);
    setSheetOpen(true);
  };

  const handleToggleActive = async (space: Space) => {
    try {
      const updated = await updateSpace(space.id, { isActive: !space.isActive });
      setSpaces((prev) =>
        prev.map((s) => (s.id === space.id ? { ...s, isActive: updated.isActive } : s))
      );
      toast({
        title: updated.isActive ? 'Espaço ativado.' : 'Espaço desativado.',
      });
    } catch (err: any) {
      const message = err.response?.data?.message || err.message;
      toast({ title: 'Erro ao alterar status', description: message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSpace(deleteTarget);
      setSpaces((prev) =>
        prev.map((s) => (s.id === deleteTarget ? { ...s, isActive: false } : s))
      );
      toast({ title: 'Espaço desativado com sucesso.' });
    } catch (err: any) {
      const message = err.response?.data?.message || err.message;
      toast({ title: 'Erro ao excluir', description: message, variant: 'destructive' });
    } finally {
      setDeleteTarget(null);
    }
  };

  const filtered = spaces.filter((s) => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesOwner = mode === 'host' ? true : (isAdmin || s.createdBy?.id === user?.id || (s as any).createdById === user?.id);

    return matchesSearch && matchesOwner;
  });

  const activeCount = filtered.filter((s) => s.isActive).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {mode === 'host' ? 'Meus Espaços' : 'Espaços (Gestão Global)'}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {mode === 'host'
                ? `${spaces.length} ${spaces.length === 1 ? 'espaço anunciado' : 'espaços anunciados'} · ${activeCount} ativos`
                : `${spaces.length} espaços cadastrados · ${activeCount} ativos`}
            </p>
          </div>
          <button
            onClick={openCreate}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium',
              'bg-foreground text-background',
              'transition-opacity duration-150 hover:opacity-85',
            )}
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            {mode === 'host' ? 'Anunciar espaço' : 'Novo espaço'}
          </button>
        </div>

        {/* Search bar */}
        <div className="relative max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50"
            strokeWidth={1.5}
          />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar espaços…"
            className={cn(
              'w-full rounded-md bg-zinc-100 dark:bg-zinc-900 pl-9 pr-3 py-2 text-sm',
              'placeholder:text-muted-foreground/40 text-foreground',
              'border-0 outline-none ring-1 ring-transparent focus:ring-ring transition-all duration-150',
            )}
          />
        </div>

        {/* Data list */}
        <div className="rounded-md border border-border/60 overflow-hidden">
          <ListHeader />

          {loading ? (
            <>
              {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
            </>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Building2 className="h-4.5 w-4.5 text-muted-foreground/50" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium text-foreground">
                {searchTerm
                  ? 'Nenhum resultado encontrado'
                  : mode === 'host'
                  ? 'Você ainda não anunciou nenhum espaço'
                  : 'Nenhum espaço cadastrado'}
              </p>
              <p className="text-xs text-muted-foreground">
                {searchTerm
                  ? 'Tente buscar por um nome diferente.'
                  : mode === 'host'
                  ? 'Anuncie seu primeiro espaço para começar a receber reservas.'
                  : 'Crie seu primeiro espaço para começar.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={openCreate}
                  className="mt-1 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-85 transition-opacity"
                >
                  {mode === 'host' ? 'Anunciar primeiro espaço' : 'Criar primeiro espaço'}
                </button>
              )}
            </div>
          ) : (
            filtered.map((space) => (
              <SpaceRow
                key={space.id}
                space={space}
                onEdit={openEdit}
                onDelete={(id) => setDeleteTarget(id)}
                onToggleActive={handleToggleActive}
              />
            ))
          )}
        </div>

        {/* Count footer */}
        {filtered.length > 0 && !loading && (
          <p className="text-xs text-muted-foreground/50 tabular-nums">
            {filtered.length} espaços encontrados
          </p>
        )}
      </div>

      {/* Create / Edit Sheet (slides from right) */}
      <SpaceSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editing={editing}
        onSaved={loadSpaces}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Excluir espaço?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Esta ação desativará o espaço. O histórico de reservas existentes permanecerá preservado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-sm">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground text-sm hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}