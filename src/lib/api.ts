import axios from 'axios';

// ─── Base URL ─────────────────────────────────────────────────────────────────
// Reads from Vite env. Set VITE_API_URL in your .env file.
// Example: VITE_API_URL=http://localhost:3000
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// ─── Storage key ─────────────────────────────────────────────────────────────
export const TOKEN_KEY = 'agendaspace_token';

// ─── Axios instance ───────────────────────────────────────────────────────────
export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 12_000,
});

// ─── Request interceptor — attach Bearer token ────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor — handle 401 globally ──────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRoute =
      error.config?.url?.includes('/auth/login') ||
      error.config?.url?.includes('/auth/register');

    if (error.response?.status === 401 && !isAuthRoute) {
      // Token expired or invalid — clear storage and redirect to login if not already there
      localStorage.removeItem(TOKEN_KEY);
      if (
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/register')
      ) {
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  }
);

// ─── Token helpers ────────────────────────────────────────────────────────────

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Decodes the JWT payload without verifying the signature.
 * Verification is performed server-side by NestJS JwtStrategy.
 */
export function decodeToken<T = Record<string, unknown>>(token: string): T | null {
  try {
    const [, payloadB64] = token.split('.');
    // Base64url → Base64 → JSON
    const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Returns true if the stored token is still valid (exp > now).
 * Does NOT verify the signature — server is the source of truth.
 */
export function isTokenValid(): boolean {
  const token = getToken();
  if (!token) return false;
  const payload = decodeToken<{ exp?: number }>(token);
  if (!payload?.exp) return false;
  // exp is in seconds; Date.now() is in ms
  return payload.exp * 1000 > Date.now();
}
