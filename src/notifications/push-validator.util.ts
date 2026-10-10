import { BadRequestException } from '@nestjs/common';
import * as net from 'net';

/**
 * Validação de Endpoint Web Push para prevenção de SSRF (Server-Side Request Forgery)
 * Garante que apenas URLs HTTPS públicas e legítimas de serviços Push sejam aceitas.
 */
export function validatePushEndpoint(endpoint: string): void {
  if (!endpoint || typeof endpoint !== 'string') {
    throw new BadRequestException('Endpoint de notificação push inválido.');
  }

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new BadRequestException('Endpoint não é uma URL válida.');
  }

  // 1. O protocolo DEVE ser estritamente HTTPS
  if (url.protocol !== 'https:') {
    throw new BadRequestException('Endpoint de push deve utilizar estritamente o protocolo HTTPS.');
  }

  // 2. Não permitir credenciais embutidas na URL (ex: https://user:pass@host)
  if (url.username || url.password) {
    throw new BadRequestException('Endpoint de push não pode conter credenciais na URL.');
  }

  // 3. Porta permitida: apenas 443 ou padrão (vazia)
  if (url.port && url.port !== '443') {
    throw new BadRequestException('Endpoint de push deve utilizar a porta padrão 443.');
  }

  const hostname = url.hostname.toLowerCase();

  // 4. Bloquear hosts locais ou de desenvolvimento
  const blockedHosts = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    'metadata.google.internal',
    'instance-data',
  ];
  if (blockedHosts.includes(hostname)) {
    throw new BadRequestException('Endpoint aponta para um endereço local ou reservado proibido.');
  }

  // 5. Bloquear sufixos de rede interna
  const blockedSuffixes = [
    '.local',
    '.localhost',
    '.internal',
    '.corp',
    '.lan',
    '.home',
    '.intranet',
    '.onion',
  ];
  if (blockedSuffixes.some((suffix) => hostname.endsWith(suffix))) {
    throw new BadRequestException('Endpoint aponta para um domínio interno restrito.');
  }

  // 6. Se o hostname for um endereço IP (IPv4 ou IPv6), verificar faixas privadas/reservadas
  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIP(hostname)) {
      throw new BadRequestException('Endpoint aponta para um endereço IP privado ou reservado.');
    }
  }

  // 7. Tamanho razoável de endpoint
  if (endpoint.length > 2048) {
    throw new BadRequestException('Tamanho do endpoint excede o limite permitido.');
  }
}

/**
 * Verifica se um endereço IP pertence a faixas privadas, de loopback ou link-local
 */
function isPrivateOrReservedIP(ip: string): boolean {
  // IPv4
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true;
    }
    // Loopback: 127.0.0.0/8
    if (parts[0] === 127) return true;
    // Current network / zero: 0.0.0.0/8
    if (parts[0] === 0) return true;
    // Private Class A: 10.0.0.0/8
    if (parts[0] === 10) return true;
    // Carrier-grade NAT: 100.64.0.0/10
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
    // Link-local / AWS / Cloud Metadata: 169.254.0.0/16
    if (parts[0] === 169 && parts[1] === 254) return true;
    // Private Class B: 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // Private Class C: 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;
    // Multicast: 224.0.0.0/4
    if (parts[0] >= 224 && parts[0] <= 239) return true;
    // Reserved: 240.0.0.0/4
    if (parts[0] >= 240) return true;
    // Broadcast: 255.255.255.255
    if (ip === '255.255.255.255') return true;

    return false;
  }

  // IPv6
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    // Loopback ::1
    if (lower === '::1' || lower === '0000:0000:0000:0000:0000:0000:0000:0001') return true;
    // Unspecified ::
    if (lower === '::' || lower === '0000:0000:0000:0000:0000:0000:0000:0000') return true;
    // Unique local address (fc00::/7)
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    // Link-local (fe80::/10)
    if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true;
    // IPv4-mapped IPv6 (::ffff:0:0/96)
    if (lower.startsWith('::ffff:')) {
      const ipv4Part = lower.replace('::ffff:', '');
      if (net.isIPv4(ipv4Part)) return isPrivateOrReservedIP(ipv4Part);
    }
  }

  return false;
}
