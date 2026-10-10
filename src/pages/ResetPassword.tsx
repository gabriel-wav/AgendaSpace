import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Lock, Loader2, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { resetPassword } from '@/lib/auth.api';
import { cn } from '@/lib/utils';

interface ResetPasswordFormData {
  newPassword: string;
  confirmPassword: string;
}

const inputCls = cn(
  'w-full rounded-md bg-zinc-100 dark:bg-zinc-900 px-3 py-2.5',
  'text-sm text-foreground placeholder:text-muted-foreground/50',
  'border-0 outline-none',
  'ring-1 ring-transparent',
  'transition-all duration-150',
  'focus:ring-ring focus:bg-zinc-50 dark:focus:bg-zinc-800',
);

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    !token ? 'Link de recuperação inválido ou token não fornecido.' : null
  );

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>();

  const newPasswordValue = watch('newPassword');

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setErrorMessage('Token de recuperação ausente.');
      return;
    }

    if (data.newPassword !== data.confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await resetPassword({
        token,
        newPassword: data.newPassword,
      });

      setSuccess(true);
      toast.success(res.message);

      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2500);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Token inválido, expirado ou já utilizado.';
      const formatted = Array.isArray(msg) ? msg[0] : msg;
      setErrorMessage(formatted);
      toast.error(formatted);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      imageSide="right"
      quote="Crie uma senha forte e única para manter o acesso aos seus espaços e reservas protegido."
      quoteAuthor="AgendaSpace — Segurança de Acesso"
    >
      <div className="animate-in-up">
        {success ? (
          <div className="text-center py-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success mb-5">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Senha redefinida com sucesso!
            </h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Sua nova senha foi gravada com sucesso e todas as sessões anteriores foram encerradas.
            </p>
            <p className="mt-4 text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Redirecionando para o login...
            </p>
            <div className="mt-6">
              <Link
                to="/login"
                className="inline-block w-full rounded-md bg-foreground py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                Acessar minha conta agora
              </Link>
            </div>
          </div>
        ) : errorMessage ? (
          <div className="text-center py-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-5">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Link inválido ou expirado
            </h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {errorMessage}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Links de recuperação são de uso único e expiram após 30 minutos.
            </p>

            <div className="mt-8 space-y-3">
              <Link
                to="/forgot-password"
                className="block w-full rounded-md bg-foreground py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                Solicitar novo link de recuperação
              </Link>
              <Link
                to="/login"
                className="flex items-center justify-center gap-1.5 w-full rounded-md border border-border bg-background py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para o login
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-8">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Definir nova senha
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Digite sua nova senha abaixo para redefinir o acesso à sua conta.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <label
                  htmlFor="newPassword"
                  className="block text-xs font-medium uppercase tracking-widest text-muted-foreground"
                >
                  Nova Senha
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    autoFocus
                    placeholder="Mínimo de 6 caracteres"
                    className={cn(inputCls, 'pr-10', errors.newPassword && 'ring-error/60')}
                    {...register('newPassword', {
                      required: 'Nova senha obrigatória',
                      minLength: { value: 6, message: 'A nova senha deve ter no mínimo 6 caracteres' },
                    })}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-xs text-error animate-in-up">{errors.newPassword.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-medium uppercase tracking-widest text-muted-foreground"
                >
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Repita a nova senha"
                    className={cn(inputCls, 'pr-10', errors.confirmPassword && 'ring-error/60')}
                    {...register('confirmPassword', {
                      required: 'Confirmação obrigatória',
                      validate: (value) =>
                        value === newPasswordValue || 'As senhas não coincidem',
                    })}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-error animate-in-up">{errors.confirmPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'mt-6 w-full rounded-md py-2.5 text-sm font-medium bg-foreground text-background transition-opacity flex items-center justify-center',
                  'hover:opacity-90 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redefinindo senha...
                  </>
                ) : (
                  'Redefinir senha'
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link
                to="/login"
                className="font-medium text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground"
              >
                Voltar para o login
              </Link>
            </p>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
