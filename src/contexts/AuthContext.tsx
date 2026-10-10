import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { isTokenValid, clearToken } from '@/lib/api';
import { login, register, fetchSession, User, logout as apiLogout } from '@/lib/auth.api';

interface AuthContextType {
  user: User | null;
  profile: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; mfaRequired?: boolean; challengeId?: string; maskedEmail?: string }>;
  verifyCodeLogin: (challengeId: string, code?: string, recoveryCode?: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ pendingVerification?: boolean; error: string | null }>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrateUser = useCallback(async () => {
    if (!isTokenValid()) {
      clearToken();
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await fetchSession();
      setUser(data);
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrateUser();
  }, [hydrateUser]);

  const signIn = useCallback(async (email: string, password: string): Promise<{ error: string | null; mfaRequired?: boolean; challengeId?: string; maskedEmail?: string }> => {
    try {
      const res = await login({ email, password });
      if (res.status === 'MFA_REQUIRED') {
        return { error: null, mfaRequired: true, challengeId: res.challengeId, maskedEmail: res.maskedEmail };
      }
      setUser(res.user);
      return { error: null };
    } catch (err: any) {
      const message = err.response?.data?.message ?? err.response?.data?.error ?? 'Falha ao autenticar. Verifique suas credenciais.';
      return { error: Array.isArray(message) ? message[0] : message };
    }
  }, []);

  const verifyCodeLogin = useCallback(async (challengeId: string, code?: string, recoveryCode?: string): Promise<{ error: string | null }> => {
    try {
      const res = await import('@/lib/auth.api').then(m => m.verifyLoginCode({ challengeId, code, recoveryCode }));
      setUser(res.user);
      return { error: null };
    } catch (err: any) {
      const message = err.response?.data?.message ?? err.response?.data?.error ?? 'Falha na verificação do código.';
      return { error: Array.isArray(message) ? message[0] : message };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string): Promise<{ pendingVerification?: boolean; error: string | null }> => {
    try {
      const res = await register({ email, password, fullName });
      if (res.status === 'PENDING_VERIFICATION') {
        return { pendingVerification: true, error: null };
      }
      return { error: null };
    } catch (err: any) {
      const message = err.response?.data?.message ?? err.response?.data?.error ?? 'Falha ao criar conta.';
      return { error: Array.isArray(message) ? message[0] : message };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { disablePushOnCurrentDevice } = await import('@/lib/push.api');
      await disablePushOnCurrentDevice();
    } catch {
      // Falha silenciosa para não impedir o encerramento da sessão
    }
    apiLogout();
    setUser(null);
    window.location.replace('/login');
  }, []);

  const value: AuthContextType = {
    user,
    profile: user,
    loading,
    isAdmin: user?.role === 'ADMIN',
    signIn,
    verifyCodeLogin,
    signUp,
    signOut,
    refreshUser: hydrateUser,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return context;
}