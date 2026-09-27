import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, saveToken, clearToken, getToken, decodeToken, isTokenValid } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Shape of the JWT payload produced by NestJS JwtStrategy */
interface JwtPayload {
  sub: string;    // User UUID
  email: string;
  exp: number;
  iat: number;
}

/** Enriched user object (decoded from token + profile endpoint) */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: 'ADMIN' | 'TENANT' | 'USER';
}

interface AuthContextType {
  /** The full authenticated user (null when logged out) */
  user: AuthUser | null;
  /** True while checking token validity on mount */
  loading: boolean;
  /** True when the user holds ADMIN role */
  isAdmin: boolean;
  /** True when the user holds TENANT role */
  isTenant: boolean;
  /** Authenticate against POST /auth/login */
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  /** Create an account via POST /auth/register */
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role?: string
  ) => Promise<{ error: string | null }>;
  /** Clear token and user state */
  signOut: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Fetch the current user's profile from the API using the stored token.
   * Called once on mount if a valid token exists.
   */
  const hydrateUser = useCallback(async () => {
    if (!isTokenValid()) {
      clearToken();
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      // GET /auth/me — returns the authenticated user's profile from MySQL via Prisma
      const { data } = await api.get<AuthUser>('/auth/me');
      setUser(data);
    } catch {
      // Token was rejected by the server (revoked, schema change, etc.)
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount: restore session from localStorage if valid
  useEffect(() => {
    hydrateUser();
  }, [hydrateUser]);

  // ─── signIn ────────────────────────────────────────────────────────────────
  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      try {
        const { data } = await api.post<{ access_token: string; user: AuthUser }>(
          '/auth/login',
          { email, password }
        );

        saveToken(data.access_token);
        setUser(data.user);
        return { error: null };
      } catch (err: any) {
        const message =
          err.response?.data?.message ??
          err.response?.data?.error ??
          'Falha ao autenticar. Verifique suas credenciais.';
        return { error: message };
      }
    },
    []
  );

  // ─── signUp ────────────────────────────────────────────────────────────────
  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      role = 'USER'
    ): Promise<{ error: string | null }> => {
      try {
        const { data } = await api.post<{ access_token: string; user: AuthUser }>(
          '/auth/register',
          { email, password, fullName, role: role.toUpperCase() }
        );

        saveToken(data.access_token);
        setUser(data.user);
        return { error: null };
      } catch (err: any) {
        const message =
          err.response?.data?.message ??
          err.response?.data?.error ??
          'Falha ao criar conta.';
        return { error: Array.isArray(message) ? message[0] : message };
      }
    },
    []
  );

  // ─── signOut ───────────────────────────────────────────────────────────────
  const signOut = useCallback(() => {
    clearToken();
    setUser(null);
    window.location.replace('/login');
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    isAdmin: user?.role === 'ADMIN',
    isTenant: user?.role === 'TENANT',
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return context;
}