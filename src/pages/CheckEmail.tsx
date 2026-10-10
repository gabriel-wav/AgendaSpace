import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { resendVerification } from '@/lib/auth.api';
import { toast } from 'sonner';

export default function CheckEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    
    setLoading(true);
    try {
      await resendVerification(email);
      toast.success('Novo email enviado com sucesso!');
      setCooldown(60);
      const timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      toast.error('Erro ao reenviar o email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-md text-center animate-in-up">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 mb-6">
          <Mail className="h-8 w-8 text-foreground" />
        </div>
        
        <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-3">
          Confira seu email
        </h1>
        
        <p className="text-sm text-muted-foreground mb-8">
          Enviamos um link de confirmação para{' '}
          <span className="font-medium text-foreground">{email || 'seu email'}</span>.
          <br className="hidden sm:block" />
          Por favor, acesse sua caixa de entrada e clique no link para ativar sua conta.
        </p>

        <div className="space-y-4">
          <button
            onClick={handleResend}
            disabled={loading || cooldown > 0 || !email}
            className="w-full rounded-md bg-foreground py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Enviando...' : cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar email'}
          </button>
          
          <button
            onClick={() => navigate('/login')}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para o login
          </button>
        </div>
      </div>
    </div>
  );
}
