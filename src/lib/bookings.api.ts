/**
 * bookings.api.ts
 *
 * Chamadas à API de Reservas consumindo o backend NestJS.
 */

import { api } from '@/lib/api';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export interface Booking {
  id: string;
  userId: string;
  spaceId: string;
  startDatetime: string;
  endDatetime: string;
  totalPrice: string;
  notes?: string | null;
  status: BookingStatus;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedAt?: string | null;
  approvedById?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
  space?: {
    id: string;
    name: string;
    description?: string | null;
    pricePerHour: string;
    imageUrl?: string | null;
    capacity?: number;
    resources?: string[];
    images?: { id: string; url: string; position: number }[];
    createdById?: string;
    createdBy?: { id: string; fullName: string } | null;
  };
  user?: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
  };
  payment?: {
    id?: string;
    method: string;
    status: string;
    amount?: string | number | null;
    simulationRef?: string | null;
    createdAt?: string | null;
  } | null;
  contract?: {
    id?: string;
    version: string;
    acceptedText?: string | null;
    createdAt?: string | null;
  } | null;
}

export interface CreateBookingPayload {
  spaceId: string;
  startDatetime: string;
  endDatetime: string;
  notes?: string;
}

export interface UpdateBookingStatusPayload {
  status?: BookingStatus;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface PayBookingPayload {
  method: 'PIX' | 'CREDIT_CARD';
  idempotencyKey: string;
  contractAcceptedText: string;
  contractVersion: string;
}

/**
 * GET /bookings
 * Retorna reservas do usuário autenticado (ou todas se for ADMIN).
 * Suporta filtro por type ('client' | 'host').
 */
export async function fetchBookings(type?: 'client' | 'host'): Promise<Booking[]> {
  const { data } = await api.get<Booking[]>('/bookings', {
    params: type ? { type } : undefined,
  });
  return data;
}

/**
 * GET /bookings/my-bookings
 * Retorna exclusivamente as reservas feitas pelo usuário autenticado (cliente).
 */
export async function fetchMyBookings(): Promise<Booking[]> {
  const { data } = await api.get<Booking[]>('/bookings/my-bookings');
  return data;
}

/**
 * GET /bookings/host
 * Retorna exclusivamente as reservas recebidas pelo anfitrião para seus espaços.
 */
export async function fetchHostBookings(): Promise<Booking[]> {
  const { data } = await api.get<Booking[]>('/bookings/host');
  return data;
}

/**
 * GET /bookings/:id
 */
export async function fetchBookingById(id: string): Promise<Booking> {
  const { data } = await api.get<Booking>(`/bookings/${id}`);
  return data;
}

/**
 * POST /bookings
 */
export async function createBooking(payload: CreateBookingPayload): Promise<Booking> {
  const { data } = await api.post<Booking>('/bookings', payload);
  return data;
}

/**
 * PATCH /bookings/:id
 */
export async function updateBookingStatus(
  id: string,
  payload: UpdateBookingStatusPayload
): Promise<Booking> {
  const { data } = await api.patch<Booking>(`/bookings/${id}`, payload);
  return data;
}

/**
 * POST /bookings/:id/pay
 */
export async function payBooking(
  id: string,
  payload: PayBookingPayload
): Promise<Booking> {
  const { data } = await api.post<Booking>(`/bookings/${id}/pay`, payload);
  return data;
}

export interface SpaceBookingSlot {
  id: string;
  startDatetime: string;
  endDatetime: string;
  status: BookingStatus;
}

/**
 * GET /bookings/space/:spaceId?date=YYYY-MM-DD
 * Retorna reservas ocupadas do espaço para exibição de conflitos.
 */
export async function fetchSpaceBookings(spaceId: string, date?: string): Promise<SpaceBookingSlot[]> {
  const { data } = await api.get<SpaceBookingSlot[]>(`/bookings/space/${spaceId}`, {
    params: date ? { date } : undefined,
  });
  return data;
}

