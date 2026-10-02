/**
 * dashboard.api.ts
 *
 * Chamadas à API de Dashboard/Relatórios consumindo o backend NestJS.
 */

import { api } from '@/lib/api';

export interface DashboardStats {
  totalSpaces: number;
  todayBookings: number;
  monthlyRevenue: string; // Decimal string
  activeUsers: number;
  recentBookings?: any[];
}

export interface HostStats {
  totalSpaces: number;
  todayBookings: number;
  monthlyRevenue: string;
}

export interface ClientStats {
  upcomingBookings: number;
  totalHours: number;
  availableSpaces: number;
  recentBookings?: any[];
}

/**
 * GET /dashboard/stats
 * Retorna estatísticas gerais (requer perfil ADMIN).
 */
export async function fetchAdminStats(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>('/dashboard/stats');
  return data;
}

/**
 * GET /dashboard/host
 * Retorna estatísticas para o anfitrião logado.
 */
export async function fetchHostStats(): Promise<HostStats> {
  const { data } = await api.get<HostStats>('/dashboard/host');
  return data;
}

/**
 * GET /dashboard/client
 * Retorna estatísticas do cliente (usuário logado).
 */
export async function fetchClientStats(): Promise<ClientStats> {
  const { data } = await api.get<ClientStats>('/dashboard/client');
  return data;
}
