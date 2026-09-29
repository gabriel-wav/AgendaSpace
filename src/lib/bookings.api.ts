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
  createdAt: string;
  updatedAt: string;
  space?: {
    id: string;
    name: string;
    pricePerHour: string;
    imageUrl?: string | null;
    capacity?: number;
    resources?: string[];
  };
  user?: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface CreateBookingPayload {
  spaceId: string;
  startDatetime: string;
  endDatetime: string;
  notes?: string;
}

export interface UpdateBookingStatusPayload {
  status: BookingStatus;
}

/**
 * GET /bookings
 * Retorna reservas do usuário autenticado (ou todas se for ADMIN).
 */
export async function fetchBookings(): Promise<Booking[]> {
  const { data } = await api.get<Booking[]>('/bookings');
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
 * PATCH /bookings/:id/status
 */
export async function updateBookingStatus(
  id: string,
  payload: UpdateBookingStatusPayload
): Promise<Booking> {
  const { data } = await api.patch<Booking>(`/bookings/${id}/status`, payload);
  return data;
}
