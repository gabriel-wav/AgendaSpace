import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { format, addHours, isAfter, isBefore, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Clock, DollarSign, MapPin, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Space {
  id: string;
  name: string;
  description: string;
  capacity: number;
  price_per_hour: number;
  resources: string[];
}

interface BookingFormProps {
  space: Space;
  onSuccess?: () => void;
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
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);

  // Generate time slots (8:00 - 22:00)
  useEffect(() => {
    const slots: TimeSlot[] = [];
    for (let hour = 8; hour <= 21; hour++) {
      slots.push({ hour, available: true });
    }
    setTimeSlots(slots);
  }, []);

  // Fetch existing bookings when date changes
  useEffect(() => {
    if (selectedDate) {
      fetchBookingsForDate(selectedDate);
    }
  }, [selectedDate, space.id]);

  // Update available slots based on existing bookings
  useEffect(() => {
    if (selectedDate && existingBookings.length > 0) {
      const updatedSlots = timeSlots.map(slot => {
        const slotStart = new Date(selectedDate);
        slotStart.setHours(slot.hour, 0, 0, 0);
        const slotEnd = addHours(slotStart, 1);

        const isConflicted = existingBookings.some(booking => {
          const bookingStart = parseISO(booking.start_datetime);
          const bookingEnd = parseISO(booking.end_datetime);
          
          return (
            (isAfter(slotStart, bookingStart) && isBefore(slotStart, bookingEnd)) ||
            (isAfter(slotEnd, bookingStart) && isBefore(slotEnd, bookingEnd)) ||
            (isBefore(slotStart, bookingStart) && isAfter(slotEnd, bookingEnd))
          );
        });

        return { ...slot, available: !isConflicted };
      });
      setTimeSlots(updatedSlots);
    }
  }, [existingBookings, selectedDate]);

  const fetchBookingsForDate = async (date: Date) => {
    try {
      const dateStart = new Date(date);
      dateStart.setHours(0, 0, 0, 0);
      
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('bookings')
        .select('start_datetime, end_datetime')
        .eq('space_id', space.id)
        .in('status', ['pending', 'confirmed'])
        .gte('start_datetime', dateStart.toISOString())
        .lte('start_datetime', dateEnd.toISOString());

      if (error) throw error;
      setExistingBookings(data || []);
    } catch (error: any) {
      console.error('Error fetching bookings:', error);
    }
  };

  const calculateTotalPrice = () => {
    if (!startTime || !endTime) return 0;
    
    const start = parseInt(startTime);
    const end = parseInt(endTime);
    const hours = end - start;
    
    return hours * space.price_per_hour;
  };

  const validateBooking = () => {
    if (!selectedDate) {
      toast({
        title: "Data obrigatória",
        description: "Selecione uma data para a reserva.",
        variant: "destructive"
      });
      return false;
    }

    if (!startTime || !endTime) {
      toast({
        title: "Horário obrigatório",
        description: "Selecione o horário de início e fim.",
        variant: "destructive"
      });
      return false;
    }

    const start = parseInt(startTime);
    const end = parseInt(endTime);

    if (start >= end) {
      toast({
        title: "Horário inválido",
        description: "O horário de fim deve ser após o horário de início.",
        variant: "destructive"
      });
      return false;
    }

    if (end - start > 8) {
      toast({
        title: "Duração máxima excedida",
        description: "A reserva pode ter no máximo 8 horas.",
        variant: "destructive"
      });
      return false;
    }

    // Check if booking is in the future (at least 1 hour from now)
    const bookingStart = new Date(selectedDate);
    bookingStart.setHours(start, 0, 0, 0);
    const oneHourFromNow = addHours(new Date(), 1);

    if (isBefore(bookingStart, oneHourFromNow)) {
      toast({
        title: "Horário inválido",
        description: "A reserva deve ser feita com pelo menos 1 hora de antecedência.",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateBooking()) return;

    setLoading(true);
    try {
      const bookingStart = new Date(selectedDate!);
      bookingStart.setHours(parseInt(startTime), 0, 0, 0);
      
      const bookingEnd = new Date(selectedDate!);
      bookingEnd.setHours(parseInt(endTime), 0, 0, 0);

      const { error } = await supabase
        .from('bookings')
        .insert([{
          user_id: user?.id,
          space_id: space.id,
          start_datetime: bookingStart.toISOString(),
          end_datetime: bookingEnd.toISOString(),
          total_price: calculateTotalPrice(),
          notes: notes || null,
          status: 'pending'
        }]);

      if (error) throw error;

      toast({
        title: "Reserva solicitada!",
        description: "Sua reserva foi enviada e está aguardando confirmação."
      });

      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Erro ao fazer reserva",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const availableStartTimes = timeSlots.filter(slot => 
    slot.available && slot.hour < 21
  );

  const availableEndTimes = startTime ? timeSlots.filter(slot => 
    slot.hour > parseInt(startTime) && slot.hour <= 22 && slot.available
  ) : [];

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center">
          <MapPin className="mr-2 h-5 w-5" />
          Reservar {space.name}
        </CardTitle>
        <CardDescription>
          Preencha os dados para solicitar sua reserva
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Space Info */}
          <div className="p-4 bg-muted/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">{space.name}</h3>
              <Badge variant="outline">
                <Users className="mr-1 h-3 w-3" />
                {space.capacity} pessoas
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{space.description}</p>
            <div className="flex flex-wrap gap-1">
              {space.resources.map((resource) => (
                <Badge key={resource} variant="secondary" className="text-xs">
                  {resource}
                </Badge>
              ))}
            </div>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Data da Reserva</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                  ) : (
                    "Selecione uma data"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => 
                    date < new Date() || date < new Date("1900-01-01")
                  }
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Selection */}
          {selectedDate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Horário de Início</Label>
                  <select
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      setEndTime(''); // Reset end time when start time changes
                    }}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    required
                  >
                    <option value="">Selecione o horário de início</option>
                    {availableStartTimes.map((slot) => (
                      <option key={slot.hour} value={slot.hour}>
                        {formatTime(slot.hour)}
                      </option>
                    ))}
                  </select>
                  {availableStartTimes.length === 0 && (
                    <p className="text-xs text-destructive">Não há horários disponíveis para esta data</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Horário de Fim</Label>
                  <select
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    required
                    disabled={!startTime}
                  >
                    <option value="">
                      {!startTime ? "Primeiro selecione o início" : "Selecione o horário de fim"}
                    </option>
                    {availableEndTimes.map((slot) => (
                      <option key={slot.hour} value={slot.hour}>
                        {formatTime(slot.hour)}
                      </option>
                    ))}
                  </select>
                  {startTime && availableEndTimes.length === 0 && (
                    <p className="text-xs text-destructive">Não há horários de fim disponíveis</p>
                  )}
                </div>
              </div>
              
              {/* Available Slots Preview */}
              {availableStartTimes.length > 0 && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Horários disponíveis hoje:</h4>
                  <div className="flex flex-wrap gap-1">
                    {availableStartTimes.slice(0, 8).map((slot) => (
                      <span 
                        key={slot.hour} 
                        className="text-xs px-2 py-1 bg-primary/10 text-primary rounded"
                      >
                        {formatTime(slot.hour)}
                      </span>
                    ))}
                    {availableStartTimes.length > 8 && (
                      <span className="text-xs text-muted-foreground">
                        +{availableStartTimes.length - 8} mais
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Price Calculation */}
          {startTime && endTime && (
            <div className="p-4 bg-primary/5 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-primary" />
                  <span className="text-sm">
                    {parseInt(endTime) - parseInt(startTime)} hora(s)
                  </span>
                </div>
                <div className="flex items-center">
                  <DollarSign className="mr-1 h-4 w-4 text-primary" />
                  <span className="text-lg font-bold">
                    R$ {calculateTotalPrice().toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Alguma informação adicional sobre sua reserva..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Processando...' : 'Solicitar Reserva'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}