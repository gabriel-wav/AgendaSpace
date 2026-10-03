/**
 * BookingDetailsDialog.tsx
 *
 * Modal de detalhes completos de uma reserva (cliente, anfitrião, admin).
 * Exibe: espaço, período, valores, status composto, pagamento e contrato.
 * Usado em: MyBookings, Dashboard, ReceivedBookings.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  Building2,
  Users,
  DollarSign,
  FileText,
  CheckCircle2,
  User2,
  RefreshCw,
} from 'lucide-react';
import { Booking, fetchBookingById } from '@/lib/bookings.api';
import { SpaceGallery } from '@/components/spaces/SpaceGallery';
import { formatBRL } from '@/lib/utils';
import { format, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BookingDetailsDialogProps {
  /** Booking ID to fetch, OR a pre-loaded booking object (will still re-fetch for freshness). */
  bookingId: string | null;
  /** Seed data to show while loading (avoids blank flash). */
  seedBooking?: Booking | null;
  open: boolean;
  onClose: () => void;
  /** Called when "Pagar" is clicked — parent opens the payment flow */
  onPayRequest?: (booking: Booking) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function durationLabel(start: string, end: string): string {
  const mins = differenceInMinutes(new Date(end), new Date(start));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

/** Determines the combined status label and colour for a booking. */
function compositeStatus(booking: Booking): {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  detail: string;
} {
  const st = booking.status.toUpperCase();
  const ap = (booking.approvalStatus || 'PENDING').toUpperCase();
  const paid = !!booking.payment && booking.payment.status === 'SUCCESS';

  if (st === 'CONFIRMED') {
    return { label: 'Confirmada', variant: 'default', detail: 'Paga e aprovada pelo anfitrião.' };
  }
  if (st === 'COMPLETED') {
    return { label: 'Concluída', variant: 'outline', detail: 'Reserva encerrada.' };
  }
  if (st === 'CANCELLED') {
    if (booking.cancellationReason === 'UNPAID_AT_START') {
      return { label: 'Cancelada', variant: 'destructive', detail: 'Cancelada automaticamente por falta de pagamento.' };
    }
    return { label: 'Cancelada', variant: 'destructive', detail: 'Reserva cancelada.' };
  }
  if (st === 'PENDING') {
    if (ap === 'REJECTED') {
      return { label: 'Recusada', variant: 'destructive', detail: 'O anfitrião recusou esta solicitação.' };
    }
    
    // Check expiration: not paid and startDatetime has passed
    const isExpired = !paid && new Date(booking.startDatetime).getTime() <= Date.now();
    if (isExpired) {
      return { label: 'Expirada', variant: 'destructive', detail: 'O prazo para pagamento (início da reserva) expirou.' };
    }

    if (paid && ap !== 'APPROVED') {
      return { label: 'Paga', variant: 'secondary', detail: 'Pagamento recebido — aguardando aprovação do anfitrião.' };
    }
    if (!paid && ap === 'APPROVED') {
      return { label: 'Aprovada', variant: 'secondary', detail: 'Aprovada pelo anfitrião — aguardando pagamento.' };
    }
    // Neither paid nor approved
    return { label: 'Pendente', variant: 'secondary', detail: 'Aguardando pagamento e aprovação do anfitrião.' };
  }
  return { label: booking.status, variant: 'secondary', detail: '' };
}

/** True only when the booking is in a state where payment is still needed */
function canPay(booking: Booking): boolean {
  const st = booking.status.toUpperCase();
  const ap = (booking.approvalStatus || 'PENDING').toUpperCase();
  const paid = !!booking.payment && booking.payment.status === 'SUCCESS';

  // Cannot pay if already paid, confirmed, completed, cancelled or rejected
  if (paid) return false;
  if (st !== 'PENDING') return false;
  if (ap === 'REJECTED') return false;

  const isExpired = new Date(booking.startDatetime).getTime() <= Date.now();
  if (isExpired) return false;

  return true;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function BookingDetailsDialog({
  bookingId,
  seedBooking,
  open,
  onClose,
  onPayRequest,
}: BookingDetailsDialogProps) {
  const [booking, setBooking] = useState<Booking | null>(seedBooking || null);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'error'>('idle');

  const load = useCallback(async (id: string) => {
    setLoadState('loading');
    try {
      const fresh = await fetchBookingById(id);
      setBooking(fresh);
      setLoadState('idle');
    } catch {
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    if (open && bookingId) {
      // Always refresh on open to get latest payment/approval state
      load(bookingId);
    }
    if (!open) {
      // Small delay so the exit animation doesn't flash stale data
      const t = setTimeout(() => {
        setBooking(seedBooking || null);
        setLoadState('idle');
      }, 250);
      return () => clearTimeout(t);
    }
  }, [open, bookingId, load]);

  const cs = booking ? compositeStatus(booking) : null;
  const img = booking?.space?.imageUrl ?? (booking?.space as any)?.image_url ?? null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary shrink-0" />
            {booking?.space?.name ?? 'Detalhes da Reserva'}
          </DialogTitle>
          <DialogDescription>
            Reserva #{bookingId?.slice(0, 8) ?? '—'} · solicitada em{' '}
            {booking ? format(new Date(booking.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '—'}
          </DialogDescription>
        </DialogHeader>

        {/* ── Loading ────────────────────────────────────────────────── */}
        {loadState === 'loading' && !booking && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Carregando detalhes…</p>
            </div>
          </div>
        )}

        {/* ── Error ──────────────────────────────────────────────────── */}
        {loadState === 'error' && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-sm text-destructive">Não foi possível carregar os detalhes.</p>
            <Button variant="outline" size="sm" onClick={() => bookingId && load(bookingId)}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Tentar novamente
            </Button>
          </div>
        )}

        {/* ── Content ────────────────────────────────────────────────── */}
        {booking && (
          <div className="space-y-5 mt-2">

            {/* Space image / Gallery */}
            <div className="mb-4">
              <SpaceGallery 
                images={booking.space?.images} 
                fallbackUrl={img} 
                spaceName={booking.space?.name || 'Espaço excluído'} 
              />
            </div>

            {/* Composite status pill */}
            {cs && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border">
                <Badge variant={cs.variant} className="shrink-0 mt-0.5">{cs.label}</Badge>
                <p className="text-sm text-muted-foreground leading-snug">{cs.detail}</p>
              </div>
            )}

            {/* ── Period ─────────────────────────────────────────────── */}
            <section>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-primary" />
                Período
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Início</p>
                  <p className="font-medium">{format(new Date(booking.startDatetime), "dd/MM/yyyy", { locale: ptBR })}</p>
                  <p className="text-muted-foreground">{format(new Date(booking.startDatetime), "HH:mm")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Término</p>
                  <p className="font-medium">{format(new Date(booking.endDatetime), "dd/MM/yyyy", { locale: ptBR })}</p>
                  <p className="text-muted-foreground">{format(new Date(booking.endDatetime), "HH:mm")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duração</p>
                  <p className="font-medium">{durationLabel(booking.startDatetime, booking.endDatetime)}</p>
                </div>
              </div>
            </section>

            {/* ── Space details ───────────────────────────────────────── */}
            {booking.space && (
              <section>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-primary" />
                  Espaço
                </h4>
                <div className="space-y-2 text-sm">
                  {booking.space.capacity && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      <span>{booking.space.capacity} pessoas</span>
                    </div>
                  )}
                  {booking.space.resources && booking.space.resources.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {booking.space.resources.map((r) => (
                        <Badge key={r} variant="outline" className="text-xs">{r}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ── Financial ───────────────────────────────────────────── */}
            <section>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-primary" />
                Financeiro
              </h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor total</span>
                  <span className="font-semibold text-primary">{formatBRL(booking.totalPrice)}</span>
                </div>
                {booking.payment ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Método</span>
                      <span className="font-medium">
                        {booking.payment.method === 'PIX' ? 'PIX' : 'Cartão de Crédito'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status pagamento</span>
                      <span className="font-medium">
                        {booking.payment.status === 'SUCCESS' ? '✓ Aprovado (simulado)' : booking.payment.status}
                      </span>
                    </div>
                    {booking.payment.simulationRef && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Referência</span>
                        <span className="font-mono text-xs">{booking.payment.simulationRef}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pagamento</span>
                    <span className="text-amber-600 font-medium">Pendente</span>
                  </div>
                )}
              </div>
            </section>

            {/* ── Approval ────────────────────────────────────────────── */}
            <section>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Aprovação do Anfitrião
              </h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium">
                    {booking.approvalStatus === 'APPROVED'
                      ? '✓ Aprovado'
                      : booking.approvalStatus === 'REJECTED'
                      ? '✗ Recusado'
                      : 'Aguardando'}
                  </span>
                </div>
                {booking.approvedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data da aprovação</span>
                    <span>{format(new Date(booking.approvedAt), "dd/MM/yyyy HH:mm")}</span>
                  </div>
                )}
                {booking.space?.createdById && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <User2 className="h-3.5 w-3.5" />
                      Anfitrião
                    </span>
                    {/* Show host name from booking.space (public) if available */}
                    <span>{(booking.space as any)?.createdBy?.fullName ?? '—'}</span>
                  </div>
                )}
              </div>
            </section>

            {/* ── Contract ────────────────────────────────────────────── */}
            {booking.contract && (
              <section>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary" />
                  Contrato Aceito
                </h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Versão</span>
                    <span className="font-mono">{booking.contract.version}</span>
                  </div>
                  {booking.contract.acceptedText && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                        Ver texto completo
                      </summary>
                      <pre className="mt-2 text-xs bg-muted rounded p-3 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                        {booking.contract.acceptedText}
                      </pre>
                    </details>
                  )}
                </div>
              </section>
            )}

            {/* ── Notes ───────────────────────────────────────────────── */}
            {booking.notes && (
              <section>
                <h4 className="text-sm font-semibold mb-1">Observações</h4>
                <p className="text-sm text-muted-foreground border-l-2 border-primary/40 pl-3">
                  {booking.notes}
                </p>
              </section>
            )}

            {/* ── Actions ─────────────────────────────────────────────── */}
            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2 border-t">
              <Button variant="outline" onClick={onClose} className="sm:flex-1">
                Fechar
              </Button>
              {canPay(booking) && onPayRequest && (
                <Button
                  className="sm:flex-1"
                  onClick={() => {
                    onClose();
                    // Small delay so details dialog unmounts before payment opens
                    requestAnimationFrame(() => onPayRequest(booking));
                  }}
                >
                  <DollarSign className="h-4 w-4 mr-1.5" />
                  Pagar Agora
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
