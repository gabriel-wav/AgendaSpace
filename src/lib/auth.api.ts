import { api, saveToken, clearToken } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  phone?: string | null;
  role: 'USER' | 'ADMIN';
  emailVerifiedAt?: string | null;
  isVerified: boolean;
  createdAt: string;
}

export interface LoginResponse {
  status: 'AUTHENTICATED' | 'UNVERIFIED' | 'MFA_REQUIRED';
  user?: User;
  accessToken?: string;
  challengeId?: string;
  maskedEmail?: string;
}

export interface RegisterResponse {
  status: 'PENDING_VERIFICATION';
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  const { data } = await api.post<RegisterResponse>('/auth/register', payload);
  return data;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', payload);
  if (data.status === 'AUTHENTICATED' || data.status === 'UNVERIFIED') {
    if (data.accessToken) {
      saveToken(data.accessToken);
    }
  }
  return data;
}

export async function verifyLoginCode(payload: { challengeId?: string; code?: string; userId?: string; password?: string; recoveryCode?: string }): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login/verify-code', payload);
  if (data.accessToken) {
    saveToken(data.accessToken);
  }
  return data;
}

export async function resendLoginCode(challengeId: string): Promise<{ success: boolean; message: string }> {
  const { data } = await api.post('/auth/login/resend-code', { challengeId });
  return data;
}

export async function fetchSession(): Promise<User> {
  const { data } = await api.get<User>('/auth/me');
  return data;
}

export function logout() {
  clearToken();
}

export async function verifyEmail(email: string, token: string): Promise<{ success: boolean; purpose: string }> {
  const { data } = await api.post('/auth/verify-email', { email, token });
  return data;
}

export async function resendVerification(email: string): Promise<{ success: boolean }> {
  const { data } = await api.post('/auth/resend-verification', { email });
  return data;
}

export async function changeEmailInit(newEmail: string, password: string): Promise<{ status: 'SUCCESS' | 'MFA_REQUIRED'; challengeId?: string; message?: string }> {
  const { data } = await api.post('/auth/change-email', { newEmail, password });
  return data;
}

export async function changeEmailConfirm(challengeId: string, code: string): Promise<{ success: boolean; message: string }> {
  const { data } = await api.post('/auth/change-email/confirm', { challengeId, code });
  return data;
}

export async function getSecurityStatus(): Promise<{ isTwoFactorEnabled: boolean; recoveryCodesRemaining: number }> {
  const { data } = await api.get('/auth/security');
  return data;
}

export async function enable2FAInit(password: string): Promise<{ challengeId: string }> {
  const { data } = await api.post('/auth/2fa/enable/init', { password });
  return data;
}

export async function enable2FAConfirm(challengeId: string, code: string): Promise<{ success: boolean; recoveryCodes: string[]; accessToken: string }> {
  const { data } = await api.post('/auth/2fa/enable/confirm', { challengeId, code });
  if (data.accessToken) saveToken(data.accessToken);
  return data;
}

export async function disable2FAInit(password: string): Promise<{ challengeId: string }> {
  const { data } = await api.post('/auth/2fa/disable/init', { password });
  return data;
}

export async function disable2FAConfirm(payload: { challengeId?: string; code?: string; recoveryCode?: string }): Promise<{ success: boolean; accessToken: string }> {
  const { data } = await api.post('/auth/2fa/disable/confirm', payload);
  if (data.accessToken) saveToken(data.accessToken);
  return data;
}

export async function regenerateRecoveryInit(password: string): Promise<{ challengeId: string }> {
  const { data } = await api.post('/auth/2fa/recovery/regenerate/init', { password });
  return data;
}

export async function regenerateRecoveryConfirm(payload: { challengeId?: string; code?: string; recoveryCode?: string }): Promise<{ success: boolean; recoveryCodes: string[] }> {
  const { data } = await api.post('/auth/2fa/recovery/regenerate/confirm', payload);
  return data;
}

export async function changePasswordInit(currentPassword: string, newPassword: string): Promise<{ status: 'SUCCESS' | 'MFA_REQUIRED'; message?: string; challengeId?: string }> {
  const { data } = await api.post('/auth/password/change/init', { currentPassword, newPassword });
  return data;
}

export async function changePasswordConfirm(payload: { challengeId: string; code?: string; recoveryCode?: string }): Promise<{ success: boolean; message: string }> {
  const { data } = await api.post('/auth/password/change/confirm', payload);
  return data;
}
