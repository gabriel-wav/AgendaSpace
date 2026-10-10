import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { verifyEmail } from '@/lib/auth.api';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const { refreshUser } = useAuth();
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleVerify = async () => {
    if (!token || !email) {
      setStatus('error');
      setMessage('Link inválido ou malformado.');
      return;
    }

    setStatus('loading');
    try {
      const res = await verifyEmail(email, token);
      setStatus('success');
      
      await refreshUser();
      
      setTimeout(() => {
        if (res.purpose === 'EMAIL_CHANGE') {
          navigate('/settings');
        } else {
          navigate('/login');
        }
      }, 3000);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Token expirado, inválido ou já utilizado.');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-md text-center">
        {status === 'idle' && (
          <div className="animate-in-up">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-4">
              Confirmar conta
            </h1>
            <p className="text-sm text-muted-foreground mb-8">
              Clique no botão abaixo para confirmar seu email e ativar sua conta.
            </p>
            <button
              onClick={handleVerify}
              className="w-full rounded-md bg-foreground py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Verificar Email
            </button>
          </div>
        )}

        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">Verificando...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center animate-in-up">
            <CheckCircle2 className="h-12 w-12 text-success mb-4" />
            <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
              Email verificado!
            </h1>
            <p className="text-sm text-muted-foreground">
              Redirecionando você...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center animate-in-up">
            <XCircle className="h-12 w-12 text-error mb-4" />
            <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
              Erro na verificação
            </h1>
            <p className="text-sm text-error/90 mb-8">{message}</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full rounded-md border border-border bg-background py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              Voltar para o login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
