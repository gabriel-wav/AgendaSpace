import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  Clock,
  DollarSign,
  User,
  Building2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  FileText,
  CreditCard,
  QrCode,
  ShieldCheck,
  Ban,
  Info,
} from 'lucide-react';
import { Booking, BookingStatus } from '@/lib/bookings.api';
import { formatBRL } from '@/lib/utils';
import { SpaceImage } from '@/components/spaces/SpaceImage';
import { getSpaceImg } from '@/components/spaces/SpaceCard';
import { format, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface BookingDetailsDialogProps {
  booking: Booking | null;
  open: boolean;
  onClose: () => void;
  onUpdateStatus?: (id: string, status: BookingStatus) => void;
  isAdminOrHost?: boolean;
}

export function BookingDetailsDialog({
  booking,
  open,
  onClose,
  onUpdateStatus,
  isAdminOrHost = true,
}: BookingDetailsDialogProps) {
  if (!booking) return null;

  const space = booking.space;
  const spaceImg = space ? getSpaceImg(space) : null;
  const user = booking.user;
  const payment = booking.payment;
  const contract = booking.contract;

  const startDate = new Date(booking.startDatetime);
  const endDate = new Date(booking.endDatetime);
  const durationMinutes = differenceInMinutes(endDate, startDate);
  const durationHours = (durationMinutes / 60).toFixed(durationMinutes % 60 === 0 ? 0 : 1);

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'CONFIRMED':
        return (
          <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 gap-1">
            <CheckCircle2 className="h-3 w-3" /> Confirmada
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 gap-1 border border-amber-300 dark:border-amber-800">
            <AlertCircle className="h-3 w-3" /> Pendente
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10 gap-1">
            <CheckCircle2 className="h-3 w-3" /> Realizada / Concluída
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" /> Cancelada
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getApprovalBadge = () => {
    if (booking.approvalStatus === 'APPROVED') {
      return (
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 gap-1">
          <ShieldCheck className="h-3 w-3" /> Aprovada pelo Anfitrião
        </Badge>
      );
    }
    if (booking.approvalStatus === 'REJECTED') {
      return (
        <Badge variant="destructive" className="gap-1">
          <Ban className="h-3 w-3" /> Rejeitada pelo Anfitrião
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 gap-1">
        <Clock className="h-3 w-3" /> Aguardando Aprovação
      </Badge>
    );
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]).join('').toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-xl">
        <DialogHeader className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Detalhes da Reserva
            </DialogTitle>
            <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
              ID: {booking.id.slice(0, 8)}...
            </span>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Solicitada em {format(new Date(booking.createdAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
          </DialogDescription>

          {/* Badges bar */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {getStatusBadge(booking.status)}
            {getApprovalBadge()}
            {payment?.status === 'SUCCESS' ? (
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 gap-1">
                <CheckCircle2 className="h-3 w-3" /> Pago
              </Badge>
            ) : (
              <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 gap-1">
                <Clock className="h-3 w-3" /> Pagamento Pendente
              </Badge>
            )}
            {booking.status === 'CANCELLED' && booking.cancellationReason === 'UNPAID_AT_START' && (
              <Badge variant="destructive" className="gap-1">
                Cancelada por falta de pagamento
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Espaço Card */}
          <div className="rounded-lg border p-4 bg-card space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Informações do Espaço
            </h4>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden border">
                <SpaceImage
                  src={spaceImg}
                  alt={space?.name || 'Espaço'}
                  containerClassName="w-full h-full bg-muted flex items-center justify-center"
                  iconClassName="h-8 w-8 text-muted-foreground/60"
                />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-base font-semibold text-foreground truncate">
                  {space?.name || 'Espaço Excluído ou Indisponível'}
                </p>
                {space?.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {space.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                  <span>
                    <strong>Capacidade:</strong> {space?.capacity || 'N/A'} pessoas
                  </span>
                  <span>•</span>
                  <span>
                    <strong>Valor/hora:</strong> {space?.pricePerHour ? formatBRL(space.pricePerHour) : 'N/A'}/h
                  </span>
                  {space?.createdBy?.fullName && (
                    <>
                      <span>•</span>
                      <span>
                        <strong>Anfitrião:</strong> {space.createdBy.fullName}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            {space?.resources && space.resources.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {space.resources.map((res: string) => (
                  <Badge key={res} variant="outline" className="text-[10px] py-0 px-1.5">
                    {res}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Agendamento & Cliente Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Horário & Duração */}
            <div className="rounded-lg border p-4 bg-card space-y-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Data e Horário
              </h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data:</span>
                  <span className="font-medium text-foreground">
                    {format(startDate, "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Horário:</span>
                  <span className="font-medium text-foreground">
                    {format(startDate, 'HH:mm')} às {format(endDate, 'HH:mm')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duração total:</span>
                  <span className="font-medium text-primary">
                    {durationHours} {Number(durationHours) === 1 ? 'hora' : 'horas'}
                  </span>
                </div>
              </div>
            </div>

            {/* Cliente / Usuário */}
            <div className="rounded-lg border p-4 bg-card space-y-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Dados do Cliente
              </h4>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border">
                  {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.fullName} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {getInitials(user?.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {user?.fullName || 'Usuário Não Identificado'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email || 'Sem email'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Pagamento & Financeiro */}
          <div className="rounded-lg border p-4 bg-card space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" /> Financeiro e Pagamento
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between items-center p-2.5 rounded-md bg-muted/40">
                <span className="text-muted-foreground">Valor Total:</span>
                <span className="text-base font-bold text-foreground">
                  {formatBRL(booking.totalPrice)}
                </span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-md bg-muted/40">
                <span className="text-muted-foreground">Método:</span>
                <span className="font-medium flex items-center gap-1 text-foreground">
                  {payment?.method === 'PIX' ? (
                    <>
                      <QrCode className="h-4 w-4 text-emerald-600" /> PIX
                    </>
                  ) : payment?.method === 'CREDIT_CARD' ? (
                    <>
                      <CreditCard className="h-4 w-4 text-primary" /> Cartão de Crédito
                    </>
                  ) : (
                    'Não informado'
                  )}
                </span>
              </div>
            </div>
            {payment && (
              <div className="text-xs text-muted-foreground space-y-1 bg-muted/20 p-2.5 rounded border">
                {payment.simulationRef && (
                  <div className="flex justify-between">
                    <span>Referência da Transação:</span>
                    <span className="font-mono">{payment.simulationRef}</span>
                  </div>
                )}
                {payment.createdAt && (
                  <div className="flex justify-between">
                    <span>Data do Pagamento:</span>
                    <span>{format(new Date(payment.createdAt), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Contrato & Aceite Digital */}
          {contract && (
            <div className="rounded-lg border p-4 bg-card space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Contrato de Locação e Aceite Digital
              </h4>
              <div className="text-xs space-y-1.5 bg-muted/30 p-3 rounded">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Versão do Termo:</span>
                  <span className="font-medium font-mono">{contract.version || 'v1.0'}</span>
                </div>
                {contract.acceptedText && (
                  <div className="pt-1 text-muted-foreground italic border-t border-border/50">
                    "{contract.acceptedText}"
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Observações */}
          {booking.notes && (
            <div className="rounded-lg border p-4 bg-card space-y-1.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" /> Observações da Reserva
              </h4>
              <p className="text-sm text-foreground whitespace-pre-line bg-muted/30 p-3 rounded">
                {booking.notes}
              </p>
            </div>
          )}

          {/* Cancelamento / Informações Adicionais */}
          {booking.cancelledAt && (
            <div className="rounded-lg border border-destructive/30 p-4 bg-destructive/5 space-y-1.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-destructive flex items-center gap-1.5">
                <Ban className="h-3.5 w-3.5" /> Dados do Cancelamento
              </h4>
              <p className="text-xs text-muted-foreground">
                Cancelada em {format(new Date(booking.cancelledAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                {booking.cancellationReason && ` · Motivo: ${booking.cancellationReason}`}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Fechar
          </Button>

          {isAdminOrHost && onUpdateStatus && (
            <>
              {booking.status.toLowerCase() === 'pending' && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      onUpdateStatus(booking.id, 'CANCELLED');
                      onClose();
                    }}
                    className="w-full sm:w-auto"
                  >
                    Cancelar Reserva
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => {
                      onUpdateStatus(booking.id, 'CONFIRMED');
                      onClose();
                    }}
                    className="w-full sm:w-auto"
                  >
                    Confirmar (Manual)
                  </Button>
                </>
              )}
              {booking.status.toLowerCase() === 'confirmed' && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      onUpdateStatus(booking.id, 'CANCELLED');
                      onClose();
                    }}
                    className="w-full sm:w-auto"
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => {
                      onUpdateStatus(booking.id, 'COMPLETED');
                      onClose();
                    }}
                    className="w-full sm:w-auto"
                  >
                    Marcar como Realizada
                  </Button>
                </>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
