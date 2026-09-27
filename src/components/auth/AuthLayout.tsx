import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface AuthLayoutProps {
  children: React.ReactNode;
  /** Qual lado aparece a imagem: 'right' (padrão para login) ou 'left' */
  imageSide?: 'left' | 'right';
  /** Quote ou tagline exibida sobre a imagem */
  quote?: string;
  quoteAuthor?: string;
}

export function AuthLayout({
  children,
  imageSide = 'right',
  quote = 'Cada espaço conta uma história. Deixe a sua começar aqui.',
  quoteAuthor = 'AgendaSpace',
}: AuthLayoutProps) {
  const imagePanel = (
    <div className="relative hidden lg:block lg:w-1/2 xl:w-[55%] overflow-hidden">
      {/* Full-bleed architectural image */}
      <img
        src="/auth-hero.jpg"
        alt="Espaço arquitetônico premium"
        className="absolute inset-0 h-full w-full object-cover"
        loading="eager"
        draggable={false}
      />
      {/* Gradient overlay so the quote is legible */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

      {/* Bottom quote */}
      <div className="absolute bottom-10 left-10 right-10">
        <blockquote>
          <p className="text-base font-medium leading-relaxed text-white/90 text-balance">
            "{quote}"
          </p>
          <footer className="mt-3 text-sm text-white/50">{quoteAuthor}</footer>
        </blockquote>
      </div>
    </div>
  );

  const formPanel = (
    <div className="flex w-full flex-col justify-center lg:w-1/2 xl:w-[45%]">
      <div className="mx-auto w-full max-w-sm px-6 py-16 sm:px-10">
        {/* Logo */}
        <Link to="/" className="mb-10 inline-flex items-center gap-2 select-none group">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-foreground group-hover:bg-foreground/80 transition-colors duration-150">
            <div className="h-3 w-3 rounded-sm bg-background" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            AgendaSpace
          </span>
        </Link>

        {/* Form content injected by the page */}
        {children}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {imageSide === 'left' ? (
        <>
          {imagePanel}
          {formPanel}
        </>
      ) : (
        <>
          {formPanel}
          {imagePanel}
        </>
      )}
    </div>
  );
}