import { api } from '@/lib/api';

export type BrowserPushPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export interface DevicePushSubscription {
  id: string;
  deviceInfo: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Converte chave base64url do VAPID para Uint8Array requerido pelo PushManager
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Verifica se a Push API e Service Workers são suportados no navegador atual
 */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Obtém o estado atual de permissão do navegador
 */
export function getBrowserPushPermission(): BrowserPushPermission {
  if (!isPushSupported()) {
    return 'unsupported';
  }
  return Notification.permission as BrowserPushPermission;
}

/**
 * Detecta um nome amigável para o dispositivo/navegador atual
 */
export function getFriendlyDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Navegador Web';
  const ua = navigator.userAgent;

  let browser = 'Navegador';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';

  let os = 'Desktop';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  return `${browser} no ${os}`;
}

/**
 * Obtém a chave pública VAPID do backend ou variável de ambiente
 */
export async function getVapidPublicKey(): Promise<string> {
  const envKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (envKey) return envKey;

  const { data } = await api.get<{ publicKey: string }>('/notifications/push/public-key');
  return data.publicKey;
}

/**
 * Registra a assinatura push deste dispositivo no backend
 */
export async function registerPushOnBackend(subscription: PushSubscription, deviceInfo?: string) {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('Assinatura Push incompleta.');
  }

  const { data } = await api.post('/notifications/push/subscribe', {
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    deviceInfo: deviceInfo || getFriendlyDeviceName(),
  });

  return data;
}

/**
 * Remove a assinatura push deste dispositivo do backend
 */
export async function unregisterPushOnBackend(endpoint: string) {
  try {
    const { data } = await api.post('/notifications/push/unsubscribe', { endpoint });
    return data;
  } catch (err) {
    // Falha silenciosa se o token já expirou ou backend indisponível
    return null;
  }
}

/**
 * Obtém a lista de dispositivos com push ativo do usuário
 */
export async function getDeviceSubscriptions(): Promise<DevicePushSubscription[]> {
  const { data } = await api.get<DevicePushSubscription[]>('/notifications/push/subscriptions');
  return data;
}

/**
 * Envia uma notificação push de teste
 */
export async function sendTestPush(): Promise<{ success: boolean; message: string }> {
  const { data } = await api.post('/notifications/push/test');
  return data;
}

/**
 * Obtém a assinatura push local existente neste navegador (sem pedir permissão)
 */
export async function getLocalPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return null;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/**
 * Registra o Service Worker com escopo correto '/'
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker não é suportado por este navegador.');
  }
  return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

/**
 * Fluxo completo de ativação por ação explícita do usuário:
 * 1. Pede permissão ao navegador (Notification.requestPermission())
 * 2. Registra o Service Worker
 * 3. Cria a assinatura Push via VAPID
 * 4. Envia para o backend vincular ao usuário logado
 */
export async function enablePushOnCurrentDevice(): Promise<PushSubscription> {
  if (!isPushSupported()) {
    throw new Error('Seu navegador não possui suporte à Push API.');
  }

  // Só pede permissão aqui (acionado por clique do usuário)
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'Permissão de notificação negada no navegador. Habilite nas configurações do site.'
        : 'Permissão de notificação não foi concedida.'
    );
  }

  const registration = await registerServiceWorker();
  await navigator.serviceWorker.ready;

  const publicKey = await getVapidPublicKey();
  const convertedKey = urlBase64ToUint8Array(publicKey);

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey,
    });
  }

  await registerPushOnBackend(subscription, getFriendlyDeviceName());
  return subscription;
}

/**
 * Desativa o Push no dispositivo atual:
 * 1. Remove do backend
 * 2. Desinscreve localmente via sub.unsubscribe()
 */
export async function disablePushOnCurrentDevice(): Promise<boolean> {
  const subscription = await getLocalPushSubscription();
  if (subscription) {
    await unregisterPushOnBackend(subscription.endpoint);
    await subscription.unsubscribe();
    return true;
  }
  return false;
}
