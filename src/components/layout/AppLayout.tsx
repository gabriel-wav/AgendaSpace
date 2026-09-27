import React from 'react';
import { Header } from '@/components/layout/Header';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
  /** Permite que páginas usem largura máxima diferente se necessário */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full';
  /** Remove padding lateral do conteúdo (ex: para páginas com grid full-bleed) */
  noPadding?: boolean;
}

const maxWidthMap: Record<NonNullable<AppLayoutProps['maxWidth']>, string> = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-3xl',
  xl:   'max-w-5xl',
  '2xl':'max-w-6xl',
  '7xl':'max-w-7xl',
  full: 'max-w-none',
};

export function AppLayout({
  children,
  maxWidth = '7xl',
  noPadding = false,
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Page content — centered, breathable margins */}
      <main
        className={cn(
          'mx-auto w-full',
          maxWidthMap[maxWidth],
          !noPadding && 'px-4 sm:px-6 py-8'
        )}
      >
        {children}
      </main>
    </div>
  );
}