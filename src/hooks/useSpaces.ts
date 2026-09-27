/**
 * useSpaces.ts
 * 
 * Hooks do React Query para o domínio de Espaços.
 * Substitui todas as queries diretas ao Supabase.
 * 
 * Padrão:
 *  - useQuery  → leitura (GET)
 *  - useMutation → escrita (POST, PATCH, DELETE) com invalidação automática
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchSpaces,
  fetchSpaceById,
  createSpace,
  updateSpace,
  deleteSpace,
  CreateSpacePayload,
  UpdateSpacePayload,
} from '@/lib/spaces.api';
import { useToast } from '@/hooks/use-toast';

// ─── Query keys ───────────────────────────────────────────────────────────────
// Centralize query keys to avoid typos and simplify invalidation.

export const spaceKeys = {
  all:    () => ['spaces'] as const,
  list:   (activeOnly: boolean) => ['spaces', 'list', { activeOnly }] as const,
  detail: (id: string) => ['spaces', 'detail', id] as const,
};

// ─── useSpaces ────────────────────────────────────────────────────────────────

/**
 * Lists spaces. Cached for 60 seconds (staleTime), re-fetches on window focus.
 * 
 * @example
 * const { data: spaces, isLoading } = useSpaces();
 */
export function useSpaces(activeOnly = true) {
  return useQuery({
    queryKey: spaceKeys.list(activeOnly),
    queryFn: () => fetchSpaces(activeOnly),
    staleTime: 60_000,   // 1 minute — space list doesn't change often
  });
}

// ─── useSpace ─────────────────────────────────────────────────────────────────

/**
 * Fetches a single space by ID.
 * 
 * @example
 * const { data: space } = useSpace('uuid-here');
 */
export function useSpace(id: string | undefined) {
  return useQuery({
    queryKey: spaceKeys.detail(id ?? ''),
    queryFn: () => fetchSpaceById(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

// ─── useCreateSpace ───────────────────────────────────────────────────────────

/**
 * Creates a new space. On success, invalidates the spaces list cache.
 * 
 * @example
 * const create = useCreateSpace();
 * create.mutate({ name: 'Studio', capacity: 10, pricePerHour: 80 });
 */
export function useCreateSpace() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: CreateSpacePayload) => createSpace(payload),
    onSuccess: () => {
      // Invalidate all space lists so they re-fetch with the new item
      queryClient.invalidateQueries({ queryKey: spaceKeys.all() });
      toast({ title: 'Espaço criado com sucesso.' });
    },
    onError: (err: any) => {
      toast({
        title: 'Erro ao criar espaço',
        description: err.response?.data?.message ?? err.message,
        variant: 'destructive',
      });
    },
  });
}

// ─── useUpdateSpace ───────────────────────────────────────────────────────────

/**
 * Updates an existing space. Invalidates both the list and the detail cache.
 * 
 * @example
 * const update = useUpdateSpace();
 * update.mutate({ id: 'uuid', payload: { name: 'New Name' } });
 */
export function useUpdateSpace() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSpacePayload }) =>
      updateSpace(id, payload),
    onSuccess: (updatedSpace) => {
      // Update the detail cache optimistically
      queryClient.setQueryData(spaceKeys.detail(updatedSpace.id), updatedSpace);
      // And re-fetch the full list
      queryClient.invalidateQueries({ queryKey: spaceKeys.all() });
      toast({ title: 'Espaço atualizado com sucesso.' });
    },
    onError: (err: any) => {
      toast({
        title: 'Erro ao atualizar espaço',
        description: err.response?.data?.message ?? err.message,
        variant: 'destructive',
      });
    },
  });
}

// ─── useDeleteSpace ───────────────────────────────────────────────────────────

/**
 * Deletes (soft-deactivates) a space. Removes the item from the list cache optimistically.
 * 
 * @example
 * const remove = useDeleteSpace();
 * remove.mutate('uuid-here');
 */
export function useDeleteSpace() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => deleteSpace(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.all() });
      toast({ title: 'Espaço desativado com sucesso.' });
    },
    onError: (err: any) => {
      toast({
        title: 'Erro ao remover espaço',
        description: err.response?.data?.message ?? err.message,
        variant: 'destructive',
      });
    },
  });
}
