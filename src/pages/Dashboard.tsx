import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { UserDashboard } from '@/components/dashboard/UserDashboard';

export default function Dashboard() {
  const { isAdmin } = useAuth();

  return isAdmin ? <AdminDashboard /> : <UserDashboard />;
}