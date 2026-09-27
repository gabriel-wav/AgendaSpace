import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface LoginFormData {
  email: string;
  password: string;
}

/** Flushed-style input — sem borda, bg sólido, anel apenas no focus */
function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-medium uppercase tracking-widest text-muted-foreground"
      >
        {label}
      </label>
      {children}
      {error && (
        <p className="text-xs text-error animate-in-up">{error}</p>
      )}
    </div>
  );
}

const inputCls = cn(
  'w-full rounded-md bg-zinc-100 dark:bg-zinc-900 px-3 py-2.5',
  'text-sm text-foreground placeholder:text-muted-foreground/50',
  'border-0 outline-none',
  'ring-1 ring-transparent',
  'transition-all duration-150',
  'focus:ring-ring focus:bg-zinc-50 dark:focus:bg-zinc-800',
);

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    const res = await signIn(data.email, data.password);
    setLoading(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Bem-vindo(a) de volta!');
      navigate('/dashboard');
    }
  };

  return (
    <div className="animate-in-up">
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Entrar na sua conta
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Bem-vindo de volta.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Email */}
        <Field id="email" label="E-mail" error={errors.email?.message}>
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
                message: 'E-mail inválido',
              },
            })}
          />
        </Field>

        {/* Password */}
        <Field id="password" label="Senha" error={errors.password?.message}>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              className={cn(inputCls, 'pr-10', errors.password && 'ring-error/60')}
              {...register('password', {
                required: 'Senha obrigatória',
                minLength: { value: 6, message: 'Mínimo 6 caracteres' },
              })}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors duration-150"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </Field>

        {/* CTA — sólido preto/branco conforme modo */}
        <button
          type="submit"
          disabled={loading}
          className={cn(
            'mt-6 w-full rounded-md py-2.5 text-sm font-medium',
            'bg-foreground text-background',
            'transition-opacity duration-150',
            'hover:opacity-90 active:opacity-80',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          )}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Entrando...
            </span>
          ) : (
            'Entrar'
          )}
        </button>
      </form>

      {/* Footer link */}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Não tem uma conta?{' '}
        <Link
          to="/register"
          className="font-medium text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground transition-colors duration-150"
        >
          Cadastre-se
        </Link>
      </p>
    </div>
  );
}