/**
 * AgendaSpace Service Worker
 * Responsável pelo recebimento e clique de Notificações Web Push em segundo plano.
 * 
 * NOTA DE SEGURANÇA E PRIVACIDADE:
 * - Não intercepta nem armazena em cache dados privados de autenticação, perfis ou tokens JWT.
 * - Somente realiza rotas internas relativas autorizadas.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  let data = {};
  try {
    data = event.data.json();
  } catch (err) {
    data = {
      title: 'AgendaSpace',
      body: event.data.text() || 'Você possui uma nova notificação no AgendaSpace.',
      url: '/notifications',
    };
  }

  const title = data.title || 'AgendaSpace';
  const notificationId = data.id || data.notificationId || 'agendaspace-push';

  const options = {
    body: data.body || 'Nova atualização disponível no AgendaSpace.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    // Deduplicação pelo ID da notificação/evento
    tag: notificationId,
    renotify: true,
    data: {
      id: notificationId,
      referenceId: data.referenceId || null,
      type: data.type || 'NOTIFICATION',
      url: data.url || '/notifications',
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notifData = event.notification.data || {};
  let targetUrl = notifData.url || '/notifications';

  // Sanitização e proteção contra URLs arbitrárias externas
  // Garante estritamente navegação interna relativa
  if (
    typeof targetUrl !== 'string' ||
    !targetUrl.startsWith('/') ||
    targetUrl.startsWith('//') ||
    targetUrl.includes('\\') ||
    targetUrl.includes('://')
  ) {
    targetUrl = '/notifications';
  }

  const destination = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se houver uma aba aberta no mesmo domínio, foca nela e navega
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.focus();
          if ('navigate' in client) {
            return client.navigate(destination);
          }
          return client;
        }
      }
      // Se nenhuma janela aberta, abre uma nova janela no endereço interno autorizado
      if (clients.openWindow) {
        return clients.openWindow(destination);
      }
    })
  );
});
