import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Calendar,
  ImagePlay,
  BarChart3,
  Users,
  Settings,
  LogOut,
  User,
  ChevronDown,
  Shield,
  Compass,
  Inbox,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

function Logo() {
  return (
    <NavLink
      to="/dashboard"
      className="flex items-center gap-2 select-none group"
    >
      {/* Minimal geometric mark */}
      <div className="flex h-6 w-6 items-center justify-center rounded bg-foreground group-hover:bg-foreground/80 transition-colors duration-150">
        <div className="h-3 w-3 rounded-sm bg-background" />
      </div>
      <span className="text-sm font-semibold tracking-tight text-foreground">
        AgendaSpace
      </span>
    </NavLink>
  );
}

function NavPill({ items }: { items: NavItem[] }) {
  const location = useLocation();

  return (
    <nav className="hidden md:flex items-center gap-0.5">
      {items.map(({ label, href, icon: Icon }) => {
        const isActive = location.pathname === href;
        return (
          <NavLink
            key={href}
            to={href}
            end
            className={cn(
              'relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors duration-150',
              isActive
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{label}</span>
            {/* Active underline indicator */}
            {isActive && (
              <span className="absolute bottom-0 left-3 right-3 h-px rounded-full bg-foreground" />
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}

function ProfileMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const displayName = user?.fullName || 'Usuário';
  const displayEmail = user?.email || '';
  const avatarUrl = user?.avatarUrl;

  const initials = (name: string) =>
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors duration-150 outline-none focus-visible:ring-1 focus-visible:ring-ring">
          <Avatar className="h-6 w-6 shrink-0">
            {avatarUrl && (
              <AvatarImage src={avatarUrl} alt={displayName} />
            )}
            <AvatarFallback className="bg-muted text-[10px] font-medium text-foreground">
              {displayName ? initials(displayName) : 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:block max-w-[120px] truncate text-sm font-medium text-foreground">
            {displayName}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-56 animate-in-up"
        align="end"
        sideOffset={8}
        forceMount
      >
        <DropdownMenuLabel className="font-normal px-3 py-2">
          <p className="text-sm font-medium leading-none text-foreground">
            {displayName}
          </p>
          <p className="mt-1 text-xs leading-none text-muted-foreground truncate">
            {displayEmail}
          </p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="gap-2 text-sm cursor-pointer"
          onClick={() => navigate('/settings')}
        >
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          Perfil
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 text-sm cursor-pointer"
          onClick={() => navigate('/settings')}
        >
          <Settings className="h-3.5 w-3.5 text-muted-foreground" />
          Configurações
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="gap-2 text-sm cursor-pointer text-destructive focus:text-destructive"
          onClick={signOut}
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Mobile menu — hamburger sheet for smaller screens */
function MobileNav({ items }: { items: NavItem[] }) {
  const location = useLocation();
  const [open, setOpen] = React.useState(false);

  return (
    <div className="md:hidden">
      <button
        aria-label="Abrir menu"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors duration-150"
      >
        <span className="flex flex-col gap-1">
          <span className={cn('h-px w-4 bg-current transition-all duration-200', open && 'translate-y-1.5 rotate-45')} />
          <span className={cn('h-px w-4 bg-current transition-opacity duration-200', open && 'opacity-0')} />
          <span className={cn('h-px w-4 bg-current transition-all duration-200', open && '-translate-y-1.5 -rotate-45')} />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-12 z-50 border-b border-border bg-background/95 backdrop-blur-md px-4 py-3 flex flex-col gap-1 animate-in-up">
          {items.map(({ label, href, icon: Icon }) => {
            const isActive = location.pathname === href;
            return (
              <NavLink
                key={href}
                to={href}
                end
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150',
                  isActive
                    ? 'bg-muted text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Header() {
  const { isAdmin } = useAuth();

  const adminNav: NavItem[] = [
    { label: 'Dashboard',  href: '/dashboard',       icon: LayoutDashboard },
    { label: 'Espaços',    href: '/admin/spaces',     icon: Building2 },
    { label: 'Reservas',   href: '/admin/bookings',   icon: Calendar },
    { label: 'Relatórios', href: '/admin/reports',    icon: BarChart3 },
    { label: 'Usuários',   href: '/admin/users',      icon: Users },
  ];

  const userNav: NavItem[] = [
    { label: 'Dashboard',          href: '/dashboard',     icon: LayoutDashboard },
    { label: 'Explorar',           href: '/spaces',        icon: Compass },
    { label: 'Minhas Reservas',    href: '/my-bookings',   icon: Calendar },
    { label: 'Meus Espaços',       href: '/my-spaces',     icon: Building2 },
    { label: 'Reservas Recebidas', href: '/host/bookings', icon: Inbox },
    { label: 'Feed',               href: '/feed',          icon: ImagePlay },
  ];

  const navItems = isAdmin ? adminNav : userNav;

  return (
    <header className="sticky top-0 z-40 h-12 w-full border-b border-border/60 bg-background/70 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Left — Logo */}
        <div className="flex items-center gap-6">
          <Logo />
          {/* Role badge */}
          {isAdmin ? (
            <span className="hidden sm:inline-flex items-center gap-1 rounded border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              <Shield className="h-2.5 w-2.5" />
              Admin
            </span>
          ) : null}
        </div>

        {/* Center — Navigation links (desktop) */}
        <NavPill items={navItems} />

        {/* Right — Profile menu + Mobile hamburger */}
        <div className="flex items-center gap-2">
          <ProfileMenu />
          <MobileNav items={navItems} />
        </div>
      </div>
    </header>
  );
}