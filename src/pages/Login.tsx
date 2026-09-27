import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <AuthLayout
      imageSide="right"
      quote="Reserve o espaço certo no momento certo. Simples assim."
      quoteAuthor="AgendaSpace — Gestão inteligente de espaços"
    >
      <LoginForm />
    </AuthLayout>
  );
}