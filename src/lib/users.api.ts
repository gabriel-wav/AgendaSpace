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
  bio?: string | null;
  phone?: string | null;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
}

export type UpdateUserProfilePayload = Partial<Omit<UserProfile, 'id' | 'email' | 'role' | 'createdAt' | 'updatedAt'>>;

/**
 * GET /profiles/me
 * Retorna o perfil do usuário logado (geralmente usado para extrair dados a mais além da auth).
 */
export async function fetchMyProfile(): Promise<UserProfile> {
  const { data } = await api.get<UserProfile>('/profiles/me');
  return data;
}

/**
 * PATCH /profiles/me
 * Atualiza o perfil do usuário logado.
 */
export async function updateMyProfile(payload: UpdateUserProfilePayload): Promise<UserProfile> {
  const { data } = await api.patch<UserProfile>('/profiles/me', payload);
  return data;
}

export interface UserPreferences {
  emailNotifications: boolean;
  emailBookings: boolean;
  emailReminders: boolean;
  loginAlerts: boolean;
  pushNotifications: boolean;
  marketingConsent: boolean;
  showPhone: boolean;
  hideFromFeed: boolean;
}

export async function getMyPreferences(): Promise<UserPreferences> {
  const { data } = await api.get<UserPreferences>('/profiles/me/preferences');
  return data;
}

export async function updateMyPreferences(payload: Partial<UserPreferences>): Promise<UserPreferences> {
  const { data } = await api.patch<UserPreferences>('/profiles/me/preferences', payload);
  return data;
}
