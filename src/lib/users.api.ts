/**
 * users.api.ts
 *
 * Chamadas à API de Usuários consumindo o backend NestJS.
 */

import { api } from '@/lib/api';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
}

export type UpdateUserProfilePayload = Partial<Omit<UserProfile, 'id' | 'email' | 'role' | 'createdAt' | 'updatedAt'>>;

/**
 * GET /users/me
 * Retorna o perfil do usuário logado (geralmente usado para extrair dados a mais além da auth).
 */
export async function fetchMyProfile(): Promise<UserProfile> {
  const { data } = await api.get<UserProfile>('/users/me');
  return data;
}

/**
 * PATCH /users/me
 * Atualiza o perfil do usuário logado.
 */
export async function updateMyProfile(payload: UpdateUserProfilePayload): Promise<UserProfile> {
  const { data } = await api.patch<UserProfile>('/users/me', payload);
  return data;
}
