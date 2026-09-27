import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { useAuth } from '@/contexts/AuthContext';

export default function Register() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <AuthLayout
      imageSide="left"
      quote="Cada espaço conta uma história. Deixe a sua começar aqui."
      quoteAuthor="AgendaSpace — Para quem cria e para quem reserva"
    >
      <RegisterForm />
    </AuthLayout>
  );
}