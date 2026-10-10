import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCircle2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markAsRead, markAllAsRead, Notification } from '@/lib/notifications.api';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function NotificationsBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(Array.isArray(data) ? data : (data as any)?.items || []);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
      setNotifications([]);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Polling every 30s
    return () => clearInterval(interval);
  }, []);

  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const unreadCount = safeNotifications.filter(n => !n.readAt).length;

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
    setIsOpen(false);
    if (!n.readAt) markAsRead(n.id).then(() => fetchNotifications());
    
    // Navigate based on type
    if (n.type.includes('BOOKING') && n.referenceId) {
      if (n.type.includes('HOST')) {
        navigate('/host/bookings'); // or dynamic to /bookings/:id but host view
      } else {
        navigate('/my-bookings');
      }
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors duration-150 outline-none focus-visible:ring-1 focus-visible:ring-ring">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-destructive">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75"></span>
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between font-normal">
          <span className="font-semibold text-foreground">Notificações</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="h-auto p-1 text-xs">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Ler todas
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <ScrollArea className="max-h-[300px] overflow-y-auto">
          {safeNotifications.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma notificação
            </div>
          ) : (
            <div className="flex flex-col gap-1 p-1">
              {safeNotifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleClickNotification(n)}
                  className={cn(
                    "flex flex-col gap-1 rounded-sm p-3 text-sm transition-colors hover:bg-muted/50 cursor-pointer",
                    !n.readAt && "bg-muted/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={cn("font-medium text-foreground", !n.readAt && "text-primary")}>
                      {n.title}
                    </span>
                    {!n.readAt && (
                      <button
                        title="Marcar como lida"
                        onClick={(e) => handleMarkAsRead(n.id, e)}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <span className="text-muted-foreground line-clamp-2 leading-snug">
                    {n.message}
                  </span>
                  <span className="text-xs text-muted-foreground/60">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer justify-center text-center text-sm" onClick={() => { setIsOpen(false); navigate('/notifications'); }}>
          Ver todas as notificações
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
