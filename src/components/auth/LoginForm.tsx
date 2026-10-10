import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { resendLoginCode } from '@/lib/auth.api';

interface LoginFormData {
  email: string;
  password: string;
}

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
  const { signIn, verifyCodeLogin } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<'CREDENTIALS' | 'MFA_CODE'>('CREDENTIALS');
  const [mfaData, setMfaData] = useState<{ challengeId: string; maskedEmail: string; password?: string; email?: string } | null>(null);
  const [useRecovery, setUseRecovery] = useState(false);
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const onSubmitCredentials = async (data: LoginFormData) => {
    setLoading(true);
    const res = await signIn(data.email, data.password);
    setLoading(false);

    if (res.error) {
      toast.error(res.error);
    } else if (res.mfaRequired) {
      setMfaData({ challengeId: res.challengeId!, maskedEmail: res.maskedEmail!, password: data.password, email: data.email });
      setStep('MFA_CODE');
      setCooldown(60);
    } else {
      toast.success('Bem-vindo(a) de volta!');
      navigate('/dashboard');
    }
  };

  const onSubmitMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !mfaData) return;

    setLoading(true);
    const res = await verifyCodeLogin(
      mfaData.challengeId,
      useRecovery ? undefined : code,
      useRecovery ? code : undefined
    );
    setLoading(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Bem-vindo(a) de volta!');
      navigate('/dashboard');
    }
  };

  const handleResend = async () => {
    if (!mfaData || cooldown > 0) return;
    setLoading(true);
    try {
      await resendLoginCode(mfaData.challengeId);
      toast.success('Código reenviado.');
      setCooldown(60);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao reenviar.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'MFA_CODE' && mfaData) {
    return (
      <div className="animate-in-up">
        <div className="mb-8">
          <button
            onClick={() => { setStep('CREDENTIALS'); setCode(''); }}
            className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </button>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Verificação em duas etapas
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {useRecovery
              ? 'Insira um dos seus códigos de recuperação de alta entropia.'
              : `Enviamos um código para o endereço ${mfaData.maskedEmail}.`}
          </p>
        </div>

        <form onSubmit={onSubmitMfa} className="space-y-4">
          <Field id="code" label={useRecovery ? 'Código de Recuperação' : 'Código de Verificação'}>
            <input
              id="code"
              type="text"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={useRecovery ? "ABC123XYZ9" : "000000"}
              className={inputCls}
              required
            />
          </Field>

          <button
            type="submit"
            disabled={loading || !code}
            className={cn(
              'mt-6 w-full rounded-md py-2.5 text-sm font-medium bg-foreground text-background transition-opacity',
              'hover:opacity-90 disabled:opacity-50'
            )}
          >
            {loading ? 'Verificando...' : 'Confirmar'}
          </button>
        </form>

        <div className="mt-6 flex flex-col space-y-3 text-center text-sm">
          {!useRecovery && (
            <button
              onClick={handleResend}
              disabled={loading || cooldown > 0}
              className="text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {cooldown > 0 ? `Reenviar código em ${cooldown}s` : 'Não recebi o código'}
            </button>
          )}
          <button
            onClick={() => { setUseRecovery(!useRecovery); setCode(''); }}
            className="font-medium text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground"
          >
            {useRecovery ? 'Usar código por email' : 'Usar código de recuperação'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in-up">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Entrar na sua conta
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Bem-vindo de volta.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmitCredentials)} className="space-y-4" noValidate>
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
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <button
          type="submit"
          disabled={loading}
          className={cn(
            'mt-6 w-full rounded-md py-2.5 text-sm font-medium bg-foreground text-background transition-opacity',
            'hover:opacity-90 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          )}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Não tem uma conta?{' '}
        <Link
          to="/register"
          className="font-medium text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground"
        >
          Cadastre-se
        </Link>
      </p>
    </div>
  );
}