/**
 * auth.api.ts
 *
 * Chamadas à API de Autenticação consumindo o backend NestJS.
 */

import { api, saveToken, clearToken, decodeToken } from '@/lib/api';

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: 'USER' | 'ADMIN';
  };
}

export interface RegisterPayload {
  email: string;
  passwordHash: string; // The backend receives it as passwordHash, though it might change to plain password
  fullName: string;
}

export interface LoginPayload {
  email: string;
  passwordHash: string;
}

/**
 * POST /auth/register
 */
export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', payload);
  if (data.accessToken) {
    saveToken(data.accessToken);
  }
  return data;
}

/**
 * POST /auth/login
 */
export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', payload);
  if (data.accessToken) {
    saveToken(data.accessToken);
  }
  return data;
}

/**
 * GET /auth/me
 * Recupera a sessão atual com base no token armazenado.
 */
export async function fetchSession(): Promise<AuthResponse['user']> {
  const { data } = await api.get<AuthResponse['user']>('/auth/me');
  return data;
}

/**
 * Logout
 * Apenas limpa o token local.
 */
export function logout() {
  clearToken();
}
