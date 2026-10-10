import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { forgotPassword } from '@/lib/auth.api';
import { cn } from '@/lib/utils';

interface ForgotPasswordFormData {
  email: string;
}

const inputCls = cn(
  'w-full rounded-md bg-zinc-100 dark:bg-zinc-900 px-3 py-2.5',
  'text-sm text-foreground placeholder:text-muted-foreground/50',
  'border-0 outline-none',
  'ring-1 ring-transparent',
  'transition-all duration-150',
  'focus:ring-ring focus:bg-zinc-50 dark:focus:bg-zinc-800',
);

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const onSubmit = async (data: ForgotPasswordFormData) => {
    if (cooldown > 0) return;
    setLoading(true);
    try {
      const res = await forgotPassword(data.email);
      setSubmittedEmail(data.email);
      setCooldown(60);
      toast.success(res.message);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Ocorreu um erro ao processar a solicitação. Tente novamente mais tarde.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      imageSide="right"
      quote="Sua conta e seus dados sempre protegidos com os mais rigorosos padrões de segurança."
      quoteAuthor="AgendaSpace — Segurança e Gestão de Espaços"
    >
      <div className="animate-in-up">
        <Link
          to="/login"
          className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Voltar para o login
        </Link>

        {submittedEmail ? (
          <div>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground text-center">
              Instruções enviadas
            </h1>
            <p className="mt-3 text-sm text-muted-foreground text-center leading-relaxed">
              Se houver uma conta disponível para esse email, enviaremos as instruções de recuperação.
            </p>
            <p className="mt-2 text-xs text-muted-foreground/80 text-center">
              Verifique sua caixa de entrada e pasta de spam para encontrar o link de redefinição de senha.
            </p>

            <div className="mt-8 space-y-3">
              <button
                type="button"
                onClick={() => {
                  setSubmittedEmail(null);
                }}
                disabled={cooldown > 0}
                className={cn(
                  'w-full rounded-md py-2.5 text-sm font-medium border border-border bg-background text-foreground transition-colors',
                  'hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-50'
                )}
              >
                {cooldown > 0 ? `Aguarde ${cooldown}s para reenviar` : 'Tentar com outro email'}
              </button>

              <Link
                to="/login"
                className="block w-full text-center rounded-md py-2.5 text-sm font-medium bg-foreground text-background transition-opacity hover:opacity-90"
              >
                Ir para o login
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-8">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Recuperar senha
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Informe o email cadastrado para enviarmos o link de recuperação.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs font-medium uppercase tracking-widest text-muted-foreground"
                >
                  E-mail
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="seu@email.com"
                    className={cn(inputCls, errors.email && 'ring-error/60')}
                    {...register('email', {
                      required: 'E-mail obrigatório',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Informe um e-mail válido',
                      },
                    })}
                  />
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none" />
                </div>
                {errors.email && (
                  <p className="text-xs text-error animate-in-up">{errors.email.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || cooldown > 0}
                className={cn(
                  'mt-6 w-full rounded-md py-2.5 text-sm font-medium bg-foreground text-background transition-opacity flex items-center justify-center',
                  'hover:opacity-90 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : cooldown > 0 ? (
                  `Aguarde ${cooldown}s para reenviar`
                ) : (
                  'Enviar link de recuperação'
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Lembrou sua senha?{' '}
              <Link
                to="/login"
                className="font-medium text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground"
              >
                Fazer login
              </Link>
            </p>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
