import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { format, addHours, isAfter, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Clock, DollarSign, MapPin, Users, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createBooking, fetchSpaceBookings, SpaceBookingSlot, Booking } from '@/lib/bookings.api';
import { formatBRL } from '@/lib/utils';
import { SpaceImage } from '@/components/spaces/SpaceImage';

export interface BookingSpace {
  id: string;
  name: string;
  description?: string;
  capacity?: number;
  pricePerHour?: number | string;
  price_per_hour?: number | string;
  resources?: string[];
  imageUrl?: string | null;
  image_url?: string | null;
}

interface BookingFormProps {
  space: BookingSpace;
  onSuccess?: (booking: Booking, action: 'PAY_NOW' | 'PAY_LATER') => void;
  onCancel?: () => void;
}

interface TimeSlot {
  hour: number;
  available: boolean;
}

export function BookingForm({ space, onSuccess, onCancel }: BookingFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitAction, setSubmitAction] = useState<'PAY_NOW' | 'PAY_LATER'>('PAY_NOW');
  const [fetchingSlots, setFetchingSlots] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [existingBookings, setExistingBookings] = useState<SpaceBookingSlot[]>([]);

  const pricePerHour = parseFloat(String(space.pricePerHour ?? space.price_per_hour ?? 0)) || 0;
  const resources = Array.isArray(space.resources) ? space.resources : [];
  const imageUrl = space.imageUrl || space.image_url;

  // Initialize time slots (8:00 - 22:00)
  useEffect(() => {
    const slots: TimeSlot[] = [];
    for (let hour = 8; hour <= 21; hour++) {
      slots.push({ hour, available: true });
    }
    setTimeSlots(slots);
  }, []);

  // Fetch occupied bookings when space or date changes
  useEffect(() => {
    if (!selectedDate || !space.id) return;

    let isMounted = true;
    const loadSlots = async () => {
      setFetchingSlots(true);
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const data = await fetchSpaceBookings(space.id, dateStr);
        if (isMounted) {
          setExistingBookings(data || []);
        }
      } catch (error) {
        // Fallback silently without breaking form if network glitch
        console.warn('Não foi possível verificar horários existentes:', error);
        if (isMounted) {
          setExistingBookings([]);
        }
      } finally {
        if (isMounted) {
          setFetchingSlots(false);
        }
      }
    };

    loadSlots();
    return () => {
      isMounted = false;
    };
  }, [selectedDate, space.id]);

  // Recalculate available slots whenever date or existingBookings change
  useEffect(() => {
    if (!selectedDate) return;

    const now = new Date();
    const isSelectedToday =
      selectedDate.getFullYear() === now.getFullYear() &&
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getDate() === now.getDate();

    const currentHour = now.getHours();

    const updatedSlots: TimeSlot[] = [];
    for (let hour = 8; hour <= 21; hour++) {
      // Past hours today are not available
      const isPast = isSelectedToday && hour <= currentHour;

      const slotStart = new Date(selectedDate);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = addHours(slotStart, 1);

      const isConflicted = existingBookings.some((booking) => {
        const bStart = new Date(booking.startDatetime);
        const bEnd = new Date(booking.endDatetime);

        return (
          (isAfter(slotStart, bStart) && isBefore(slotStart, bEnd)) ||
          (isAfter(slotEnd, bStart) && isBefore(slotEnd, bEnd)) ||
          (isBefore(slotStart, bStart) && isAfter(slotEnd, bEnd)) ||
          slotStart.getTime() === bStart.getTime()
        );
      });

      updatedSlots.push({
        hour,
        available: !isPast && !isConflicted,
      });
    }

    setTimeSlots(updatedSlots);

    // If current selected start or end time is no longer available/valid, reset them
    if (startTime) {
      const startHour = parseInt(startTime, 10);
      const startSlot = updatedSlots.find((s) => s.hour === startHour);
      if (!startSlot?.available) {
        setStartTime('');
        setEndTime('');
      } else if (endTime) {
        const endHour = parseInt(endTime, 10);
        let isValid = true;
        for (let h = startHour; h < endHour; h++) {
          if (!updatedSlots.find((s) => s.hour === h)?.available) {
            isValid = false;
            break;
          }
        }
        if (!isValid) {
          setEndTime('');
        }
      }
    }
  }, [existingBookings, selectedDate]);

  const calculateHours = () => {
    if (!startTime || !endTime) return 0;
    const start = parseInt(startTime, 10);
    const end = parseInt(endTime, 10);
    return Math.max(0, end - start);
  };

  const calculateTotalPrice = () => {
    return calculateHours() * pricePerHour;
  };

  const validateBooking = () => {
    if (!selectedDate) {
      toast({
        title: 'Data obrigatória',
        description: 'Selecione uma data para a reserva.',
        variant: 'destructive',
      });
      return false;
    }

    if (!startTime || !endTime) {
      toast({
        title: 'Horário obrigatório',
        description: 'Selecione o horário de início e término.',
        variant: 'destructive',
      });
      return false;
    }

    const start = parseInt(startTime, 10);
    const end = parseInt(endTime, 10);

    if (start >= end) {
      toast({
        title: 'Horário inválido',
        description: 'O horário de término deve ser posterior ao horário de início.',
        variant: 'destructive',
      });
      return false;
    }

    if (end - start > 12) {
      toast({
        title: 'Duração máxima excedida',
        description: 'A reserva pode ter no máximo 12 horas consecutivas.',
        variant: 'destructive',
      });
      return false;
    }

    const bookingStart = new Date(selectedDate);
    bookingStart.setHours(start, 0, 0, 0);

    if (bookingStart.getTime() <= Date.now()) {
      toast({
        title: 'Horário no passado',
        description: 'A reserva deve ser agendada para um horário futuro.',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent, action: 'PAY_NOW' | 'PAY_LATER') => {
    e.preventDefault();
    if (!validateBooking()) return;

    setLoading(true);
    setSubmitAction(action);
    try {
      const bookingStart = new Date(selectedDate!);
      bookingStart.setHours(parseInt(startTime, 10), 0, 0, 0);

      const bookingEnd = new Date(selectedDate!);
      bookingEnd.setHours(parseInt(endTime, 10), 0, 0, 0);

      const createdBooking = await createBooking({
        spaceId: space.id,
        startDatetime: bookingStart.toISOString(),
        endDatetime: bookingEnd.toISOString(),
        notes: notes.trim() ? notes.trim() : undefined,
      });

      toast({
        title: 'Reserva solicitada!',
        description: action === 'PAY_NOW' ? 'Redirecionando para pagamento...' : 'Sua reserva foi criada com sucesso.',
      });

      onSuccess?.(createdBooking, action);
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Não foi possível registrar a reserva.';
      toast({
        title: 'Erro ao fazer reserva',
        description: Array.isArray(message) ? message.join(', ') : message,
        variant: 'destructive',
      });

      if (error.response?.status === 409) {
        // Conflito! Re-fetch slots silenciosamente para atualizar UI
        const dateStr = format(selectedDate!, 'yyyy-MM-dd');
        fetchSpaceBookings(space.id, dateStr)
          .then(data => setExistingBookings(data || []))
          .catch(() => {});
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const availableStartTimes = timeSlots.filter((slot) => slot.available && slot.hour <= 21);

  let availableEndTimes: { hour: number }[] = [];
  if (startTime) {
    const startHour = parseInt(startTime, 10);
    for (let h = startHour + 1; h <= 22; h++) {
      const slotBefore = timeSlots.find((s) => s.hour === h - 1);
      if (!slotBefore || !slotBefore.available) {
        break; // Não pode atravessar ocupados
      }
      availableEndTimes.push({ hour: h });
    }
  }

  return (
    <form className="space-y-5">
      {/* Space Overview Card */}
      <div className="flex flex-col sm:flex-row gap-3 p-3.5 bg-muted/40 border border-border/60 rounded-xl items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg overflow-hidden border border-border/50 shrink-0">
            <SpaceImage
              src={imageUrl}
              alt={space.name}
              containerClassName="w-full h-full bg-primary/10 flex items-center justify-center"
              iconClassName="h-6 w-6 text-primary"
            />
          </div>
          <div>
            <h4 className="font-semibold text-foreground text-base leading-tight">
              {space.name}
            </h4>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
              {space.capacity ? (
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  Até {space.capacity} pessoas
                </span>
              ) : null}
              {resources.length > 0 && (
                <span>• {resources.slice(0, 2).join(', ')}{resources.length > 2 ? ` +${resources.length - 2}` : ''}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
          <span className="text-xs text-muted-foreground">Valor por hora</span>
          <span className="text-base font-bold text-primary">
            {formatBRL(pricePerHour)}/h
          </span>
        </div>
      </div>

      {/* Date Selection */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-foreground">
          Data da Reserva <span className="text-destructive">*</span>
        </Label>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal h-10 border-input hover:bg-muted/50 transition-colors',
                !selectedDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-primary shrink-0" />
              {selectedDate ? (
                <span className="capitalize text-foreground font-medium">
                  {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              ) : (
                'Selecione o dia desejado'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-50 shadow-xl" align="start" sideOffset={6}>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setCalendarOpen(false);
              }}
              disabled={(date) => {
                const today = startOfDay(new Date());
                return isBefore(date, today);
              }}
              initialFocus
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Time Selection */}
      {selectedDate && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Start Time */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">
                Horário de Início <span className="text-destructive">*</span>
              </Label>
              <select
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setEndTime('');
                }}
                className="w-full h-10 px-3 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-input transition-colors"
                required
              >
                <option value="">Selecione o início</option>
                {availableStartTimes.map((slot) => (
                  <option key={slot.hour} value={slot.hour}>
                    {formatTime(slot.hour)}
                  </option>
                ))}
              </select>
              {availableStartTimes.length === 0 && !fetchingSlots && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  Nenhum horário livre restante nesta data
                </p>
              )}
            </div>

            {/* End Time */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">
                Horário de Término <span className="text-destructive">*</span>
              </Label>
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full h-10 px-3 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-input transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                required
                disabled={!startTime}
              >
                <option value="">
                  {!startTime ? 'Escolha o início primeiro' : 'Selecione o término'}
                </option>
                {availableEndTimes.map((slot) => (
                  <option key={slot.hour} value={slot.hour}>
                    {formatTime(slot.hour)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick slot indicators */}
          {availableStartTimes.length > 0 && (
            <div className="p-3 bg-muted/20 border border-border/50 rounded-lg">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  Horários de início disponíveis hoje:
                </span>
                {fetchingSlots && (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Atualizando...
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-0.5">
                {availableStartTimes.map((slot) => (
                  <button
                    key={slot.hour}
                    type="button"
                    onClick={() => {
                      setStartTime(String(slot.hour));
                      setEndTime(String(slot.hour + 1));
                    }}
                    className={cn(
                      'text-xs px-2 py-0.5 rounded border transition-colors',
                      startTime === String(slot.hour)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted text-foreground border-border/70'
                    )}
                  >
                    {formatTime(slot.hour)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Price Summary */}
      {startTime && endTime && calculateHours() > 0 && (
        <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl transition-all animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary shrink-0" />
              <div className="text-sm font-medium text-foreground">
                <span>{calculateHours()} hora(s) selecionada(s)</span>
                <span className="text-xs text-muted-foreground block">
                  {formatTime(parseInt(startTime, 10))} às {formatTime(parseInt(endTime, 10))} ({calculateHours()}h × {formatBRL(pricePerHour)})
                </span>
              </div>
            </div>

            <div className="flex items-baseline gap-1 self-end sm:self-auto">
              <span className="text-xs text-muted-foreground font-medium">Total:</span>
              <span className="text-xl font-bold text-primary">
                {formatBRL(calculateTotalPrice())}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Notes Field */}
      <div className="space-y-1.5">
        <Label htmlFor="notes" className="text-sm font-medium text-foreground">
          Observações para o anfitrião <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
        </Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex: Reunião de equipe com 8 pessoas, precisaremos de projetor..."
          rows={2}
          className="resize-none text-sm"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
        )}
        <Button
          type="button"
          onClick={(e) => handleSubmit(e, 'PAY_LATER')}
          disabled={loading || !selectedDate || !startTime || !endTime}
          variant="secondary"
          className="w-full sm:flex-1 font-semibold"
        >
          {loading && submitAction === 'PAY_LATER' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            'Pagar Depois'
          )}
        </Button>
        <Button
          type="button"
          onClick={(e) => handleSubmit(e, 'PAY_NOW')}
          disabled={loading || !selectedDate || !startTime || !endTime}
          className="w-full sm:flex-1 font-semibold"
        >
          {loading && submitAction === 'PAY_NOW' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            'Pagar Agora'
          )}
        </Button>
      </div>
    </form>
  );
}