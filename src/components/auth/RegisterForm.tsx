import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface RegisterFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/** Flushed-style input — bg sólido, sem borda, anel no focus */
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

/** Indicador de força de senha minimalista */
function PasswordStrength({ password }: { password: string }) {
  const rules = [
    { label: 'Mínimo 6 caracteres',       met: password.length >= 6 },
    { label: 'Letra maiúscula',            met: /[A-Z]/.test(password) },
    { label: 'Número ou caractere especial', met: /[\d\W]/.test(password) },
  ];

  if (!password) return null;

  return (
    <ul className="mt-2 space-y-1">
      {rules.map(({ label, met }) => (
        <li key={label} className="flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              'flex h-3.5 w-3.5 items-center justify-center rounded-full transition-colors duration-200',
              met ? 'bg-success' : 'bg-border'
            )}
          >
            {met && <Check className="h-2 w-2 text-white" strokeWidth={3} />}
          </span>
          <span className={met ? 'text-muted-foreground' : 'text-muted-foreground/50'}>
            {label}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Seletor de tipo de conta — pills sem dropdown */
function RoleSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const options = [
    { value: 'user',   label: 'Usuário',     description: 'Reserva espaços' },
    { value: 'tenant', label: 'Locatário',   description: 'Gerencia espaços' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-md px-3 py-2.5 text-left transition-all duration-150',
            'ring-1',
            value === opt.value
              ? 'bg-foreground text-background ring-foreground'
              : 'bg-zinc-100 dark:bg-zinc-900 text-foreground ring-transparent hover:ring-border',
          )}
        >
          <span className="block text-xs font-semibold">{opt.label}</span>
          <span className={cn(
            'block text-[11px] mt-0.5',
            value === opt.value ? 'text-background/60' : 'text-muted-foreground'
          )}>
            {opt.description}
          </span>
        </button>
      ))}
    </div>
  );
}

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('user');
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterFormData>();

  const watchPassword = watch('password', '');

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    const res = await signUp(data.email, data.password, data.fullName, role);
    setLoading(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Conta criada com sucesso!');
      navigate('/dashboard');
    }
  };

  return (
    <div className="animate-in-up">
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Criar sua conta
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Rápido e gratuito. Sem cartão de crédito.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Full name */}
        <Field id="fullName" label="Nome completo" error={errors.fullName?.message}>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            autoFocus
            placeholder="Ana Costa"
            className={cn(inputCls, errors.fullName && 'ring-error/60')}
            {...register('fullName', {
              required: 'Nome obrigatório',
              minLength: { value: 2, message: 'Mínimo 2 caracteres' },
            })}
          />
        </Field>

        {/* Email */}
        <Field id="email" label="E-mail" error={errors.email?.message}>
          <input
            id="email"
            type="email"
            autoComplete="email"
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

        {/* Account type — pill selector */}
        <Field id="role" label="Tipo de conta" error={undefined}>
          <RoleSelector value={role} onChange={setRole} />
        </Field>

        {/* Password */}
        <Field id="password" label="Senha" error={errors.password?.message}>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
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
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <PasswordStrength password={watchPassword} />
        </Field>

        {/* Confirm password */}
        <Field id="confirmPassword" label="Confirmar senha" error={errors.confirmPassword?.message}>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              className={cn(inputCls, 'pr-10', errors.confirmPassword && 'ring-error/60')}
              {...register('confirmPassword', {
                required: 'Confirme a senha',
                validate: (v) => v === watchPassword || 'As senhas não coincidem',
              })}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors duration-150"
              aria-label={showConfirm ? 'Ocultar' : 'Mostrar'}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
              Criando conta...
            </span>
          ) : (
            'Criar conta'
          )}
        </button>
      </form>

      {/* Footer link */}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Já tem uma conta?{' '}
        <Link
          to="/login"
          className="font-medium text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground transition-colors duration-150"
        >
          Entrar
        </Link>
      </p>

      {/* Legal note */}
      <p className="mt-4 text-center text-[11px] text-muted-foreground/60 leading-relaxed">
        Ao criar uma conta você concorda com os{' '}
        <a href="#" className="underline underline-offset-2 hover:text-muted-foreground transition-colors duration-150">
          Termos de Uso
        </a>{' '}
        e a{' '}
        <a href="#" className="underline underline-offset-2 hover:text-muted-foreground transition-colors duration-150">
          Política de Privacidade
        </a>.
      </p>
    </div>
  );
}