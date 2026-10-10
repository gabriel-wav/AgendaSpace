import React, { useEffect, useState } from 'react';
import { getNotifications, markAsRead, markAllAsRead, Notification } from '@/lib/notifications.api';
import { CheckCircle2, Check, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(Array.isArray(data) ? data : (data as any)?.items || []);
    } catch (err) {
      console.error(err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleClickNotification = (n: Notification) => {
    if (!n.readAt) handleMarkAsRead(n.id);
    
    if (n.type.includes('BOOKING') && n.referenceId) {
      if (n.type.includes('HOST')) {
        navigate('/host/bookings');
      } else {
        navigate('/my-bookings');
      }
    }
  };

  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const unreadCount = safeNotifications.filter(n => !n.readAt).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Bell className="h-6 w-6" />
          Notificações
        </h1>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllAsRead} variant="outline" size="sm">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Ler todas
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Carregando...</div>
      ) : safeNotifications.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-muted/30 rounded-lg border border-dashed border-border">
          Nenhuma notificação encontrada.
        </div>
      ) : (
        <div className="space-y-4">
          {safeNotifications.map(n => (
            <div
              key={n.id}
              onClick={() => handleClickNotification(n)}
              className={cn(
                "p-4 rounded-lg border transition-colors cursor-pointer",
                !n.readAt
                  ? "bg-muted/50 border-primary/20"
                  : "bg-background border-border hover:bg-muted/30"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <h3 className={cn("font-semibold", !n.readAt ? "text-primary" : "text-foreground")}>
                    {n.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {n.message}
                  </p>
                  <p className="text-xs text-muted-foreground/80 mt-2">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
                {!n.readAt && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleMarkAsRead(n.id, e)}
                    className="shrink-0 text-muted-foreground hover:text-primary"
                    title="Marcar como lida"
                  >
                    <Check className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
