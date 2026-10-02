/**
 * spaces.api.ts
 * 
 * Todas as chamadas à API de Espaços consumindo o backend NestJS.
 * Cada função retorna os dados tipados. Erros são propagados para
 * o React Query tratar via onError ou ErrorBoundary.
 */

import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Space {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  pricePerHour: string;    // Decimal vindo do Prisma/MySQL como string
  resources: string[];
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface CreateSpacePayload {
  name: string;
  description?: string;
  capacity: number;
  pricePerHour: number;
  resources?: string[];
  imageUrl?: string;
  isActive?: boolean;
}

export type UpdateSpacePayload = Partial<CreateSpacePayload>;

// ─── API functions ────────────────────────────────────────────────────────────

/**
 * GET /spaces
 * Retorna a lista de espaços. O interceptor do axios injeta o Bearer token.
 */
export async function fetchSpaces(activeOnly = true): Promise<Space[]> {
  const { data } = await api.get<Space[]>('/spaces', {
    params: { activeOnly },
  });
  return data;
}

/**
 * GET /spaces/mine — retorna espaços cadastrados pelo anfitrião autenticado via JWT
 */
export async function fetchMySpaces(): Promise<Space[]> {
  const { data } = await api.get<Space[]>('/spaces/mine');
  return data;
}

/**
 * GET /spaces/:id
 */
export async function fetchSpaceById(id: string): Promise<Space> {
  const { data } = await api.get<Space>(`/spaces/${id}`);
  return data;
}

/**
 * POST /spaces — requer autenticação (qualquer USER autenticado no Modelo Airbnb)
 */
export async function createSpace(payload: CreateSpacePayload): Promise<Space> {
  const { data } = await api.post<Space>('/spaces', payload);
  return data;
}

/**
 * PATCH /spaces/:id — requer autenticação
 */
export async function updateSpace(
  id: string,
  payload: UpdateSpacePayload
): Promise<Space> {
  const { data } = await api.patch<Space>(`/spaces/${id}`, payload);
  return data;
}

/**
 * DELETE /spaces/:id — requer autenticação
 * No backend faz soft-delete (isActive = false)
 */
export async function deleteSpace(id: string): Promise<{ isActive: false }> {
  const { data } = await api.delete<{ isActive: false }>(`/spaces/${id}`);
  return data;
}
