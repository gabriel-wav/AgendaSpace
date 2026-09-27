import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Require ADMIN role to access */
  requireAdmin?: boolean;
  /** Require TENANT or ADMIN role to access */
  requireTenant?: boolean;
}

export function ProtectedRoute({
  children,
  requireAdmin = false,
  requireTenant = false,
}: ProtectedRouteProps) {
  const { user, loading, isAdmin, isTenant } = useAuth();
  const location = useLocation();

  // Waiting for token hydration on first load
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" strokeWidth={1.5} />
      </div>
    );
  }

  // Not authenticated at all
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Route requires ADMIN role
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Route requires TENANT or ADMIN role
  if (requireTenant && !isTenant && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}