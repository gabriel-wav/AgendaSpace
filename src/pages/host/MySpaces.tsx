import React from 'react';
import AdminSpaces from '@/pages/admin/Spaces';

/**
 * Página "Meus Espaços" (/my-spaces)
 * Permite que qualquer usuário autenticado (modelo Airbnb de conta única)
 * gerencie seus próprios anúncios de espaços e crie novos anúncios.
 */
export default function HostMySpaces() {
  return <AdminSpaces mode="host" />;
}
