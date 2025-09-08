import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Building2, 
  Calendar, 
  LayoutDashboard, 
  Settings, 
  Users, 
  BarChart3,
  MapPin
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';

export function AppSidebar() {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const currentPath = location.pathname;

  const adminItems = [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, description: 'Visão geral' },
    { title: 'Espaços', url: '/admin/spaces', icon: Building2, description: 'Gerenciar espaços' },
    { title: 'Reservas', url: '/admin/bookings', icon: Calendar, description: 'Ver todas reservas' },
    { title: 'Relatórios', url: '/admin/reports', icon: BarChart3, description: 'Análises e dados' },
    { title: 'Usuários', url: '/admin/users', icon: Users, description: 'Gerenciar usuários' },
  ];

  const userItems = [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, description: 'Visão geral' },
    { title: 'Buscar Espaços', url: '/spaces', icon: MapPin, description: 'Encontre espaços' },
    { title: 'Minhas Reservas', url: '/my-bookings', icon: Calendar, description: 'Gerencie reservas' },
  ];

  const items = isAdmin ? adminItems : userItems;

  const isActive = (path: string) => currentPath === path;

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? 'bg-primary/10 text-primary font-medium border-r-2 border-primary' 
      : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground';

  return (
    <Sidebar
      className="w-64"
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {isAdmin ? 'Administração' : 'Menu Principal'}
          </SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                   <SidebarMenuButton asChild className="h-16">
                     <NavLink 
                       to={item.url} 
                       end 
                       className={getNavCls}
                     >
                       <div className="flex flex-col items-start gap-1 w-full">
                         <div className="flex items-center gap-3">
                           <item.icon className="h-4 w-4" />
                           <span className="font-medium">{item.title}</span>
                         </div>
                         {item.description && (
                           <span className="text-xs text-muted-foreground ml-7">{item.description}</span>
                         )}
                       </div>
                     </NavLink>
                   </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/settings" 
                    className={getNavCls}
                  >
                    <Settings className="h-4 w-4" />
                    <span>Configurações</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}