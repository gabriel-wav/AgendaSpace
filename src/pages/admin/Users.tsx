import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Users,
  Search,
  UserCheck,
  UserX,
  Shield,
  User,
  Ban,
  CheckCircle2,
  Undo2,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl?: string;
  isDeleted?: boolean;
  deletedAt?: string | null;
  createdAt: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'banned'>('all');
  const [banTarget, setBanTarget] = useState<UserProfile | null>(null);
  const [isBanning, setIsBanning] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/profiles');
      setUsers(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os usuários.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleUserRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole.toLowerCase() === 'admin' ? 'USER' : 'ADMIN';
    setActionLoadingId(userId);

    try {
      await api.patch(`/profiles/${userId}`, { role: newRole });

      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));

      toast({
        title: "Sucesso",
        description: `Usuário ${newRole === 'ADMIN' ? 'promovido a administrador' : 'removido da administração'}.`
      });
    } catch (error: any) {
      console.error('Erro ao alterar role:', error);
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Não foi possível alterar as permissões do usuário.",
        variant: "destructive"
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBanUser = async () => {
    if (!banTarget) return;
    setIsBanning(true);

    try {
      await api.delete(`/profiles/${banTarget.id}`);

      setUsers(prev => prev.map(u => 
        u.id === banTarget.id
          ? { ...u, isDeleted: true, deletedAt: new Date().toISOString() }
          : u
      ));

      toast({
        title: "Usuário banido",
        description: `O usuário ${banTarget.fullName} foi banido com sucesso (soft delete).`,
      });
      setBanTarget(null);
    } catch (error: any) {
      console.error('Erro ao banir usuário:', error);
      toast({
        title: "Erro ao banir",
        description: error.response?.data?.message || "Não foi possível banir o usuário.",
        variant: "destructive"
      });
    } finally {
      setIsBanning(false);
    }
  };

  const handleUnbanUser = async (userToUnban: UserProfile) => {
    setActionLoadingId(userToUnban.id);

    try {
      await api.patch(`/profiles/${userToUnban.id}/restore`);

      setUsers(prev => prev.map(u => 
        u.id === userToUnban.id
          ? { ...u, isDeleted: false, deletedAt: null }
          : u
      ));

      toast({
        title: "Usuário reativado",
        description: `O usuário ${userToUnban.fullName} foi reativado e agora pode acessar a plataforma.`,
      });
    } catch (error: any) {
      console.error('Erro ao reativar usuário:', error);
      toast({
        title: "Erro ao reativar",
        description: error.response?.data?.message || "Não foi possível reativar o usuário.",
        variant: "destructive"
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filterTab === 'active') return !user.isDeleted;
    if (filterTab === 'banned') return !!user.isDeleted;
    return true;
  });

  const getInitials = (name: string) => {
    return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();
  };

  const totalUsers = users.length;
  const activeUsersCount = users.filter(u => !u.isDeleted).length;
  const bannedUsersCount = users.filter(u => u.isDeleted).length;
  const adminUsersCount = users.filter(u => u.role.toLowerCase() === 'admin' && !u.isDeleted).length;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Carregando usuários...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
            <p className="text-muted-foreground">Gerencie contas, permissões e status dos usuários do sistema</p>
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground">Contas cadastradas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeUsersCount}</div>
              <p className="text-xs text-muted-foreground">Acesso liberado</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários Banidos</CardTitle>
              <Ban className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{bannedUsersCount}</div>
              <p className="text-xs text-muted-foreground">Soft delete aplicado</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Administradores</CardTitle>
              <Shield className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminUsersCount}</div>
              <p className="text-xs text-muted-foreground">Gestores globais</p>
            </CardContent>
          </Card>
        </div>

        {/* Users list card */}
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Lista de Usuários</CardTitle>
                <CardDescription>
                  Visualize, altere permissões e faça o controle de acesso por soft-delete
                </CardDescription>
              </div>

              {/* Search box */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <Tabs value={filterTab} onValueChange={(v) => setFilterTab(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-3 max-w-sm">
                <TabsTrigger value="all">
                  Todos ({users.length})
                </TabsTrigger>
                <TabsTrigger value="active">
                  Ativos ({activeUsersCount})
                </TabsTrigger>
                <TabsTrigger value="banned">
                  Banidos ({bannedUsersCount})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastrado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    const isAdminUser = u.role.toLowerCase() === 'admin';
                    const isBusy = actionLoadingId === u.id;

                    return (
                      <TableRow key={u.id} className={u.isDeleted ? 'bg-muted/30 opacity-80' : undefined}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              {u.avatarUrl && (
                                <AvatarImage src={u.avatarUrl} alt={u.fullName} />
                              )}
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {getInitials(u.fullName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium flex items-center gap-1.5">
                                {u.fullName}
                                {isSelf && (
                                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded font-semibold">
                                    Você
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          <Badge variant={isAdminUser ? 'default' : 'secondary'} className="gap-1">
                            {isAdminUser ? (
                              <>
                                <Shield className="h-3 w-3" /> Administrador
                              </>
                            ) : (
                              <>
                                <User className="h-3 w-3" /> Usuário
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {u.isDeleted ? (
                            <div className="flex flex-col gap-0.5">
                              <Badge variant="destructive" className="gap-1 w-fit">
                                <Ban className="h-3 w-3" /> Banido
                              </Badge>
                              {u.deletedAt && (
                                <span className="text-[11px] text-muted-foreground">
                                  {format(new Date(u.deletedAt), 'dd/MM/yyyy', { locale: ptBR })}
                                </span>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 gap-1 w-fit">
                              <CheckCircle2 className="h-3 w-3" /> Ativo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(u.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Toggle admin role */}
                            {!u.isDeleted && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isSelf || isBusy}
                                onClick={() => toggleUserRole(u.id, u.role)}
                                title={isSelf ? 'Você não pode alterar sua própria função' : undefined}
                              >
                                {isBusy ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : isAdminUser ? (
                                  <>
                                    <UserX className="h-3.5 w-3.5 mr-1" />
                                    Remover Admin
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-3.5 w-3.5 mr-1" />
                                    Tornar Admin
                                  </>
                                )}
                              </Button>
                            )}

                            {/* Ban / Restore Button */}
                            {u.isDeleted ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isBusy}
                                onClick={() => handleUnbanUser(u)}
                                className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                              >
                                {isBusy ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                ) : (
                                  <Undo2 className="h-3.5 w-3.5 mr-1" />
                                )}
                                Desbanir
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isSelf || isBusy}
                                onClick={() => setBanTarget(u)}
                                className="border-destructive/30 text-destructive hover:bg-destructive/10"
                                title={isSelf ? 'Você não pode banir a si mesmo' : undefined}
                              >
                                <Ban className="h-3.5 w-3.5 mr-1" />
                                Banir
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold">Nenhum usuário encontrado</h3>
                <p className="text-muted-foreground text-sm">
                  {searchTerm
                    ? 'Tente ajustar sua busca por nome ou email.'
                    : filterTab === 'banned'
                    ? 'Não há usuários banidos na plataforma.'
                    : 'Não há usuários cadastrados nesta categoria.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog for Banning */}
      <AlertDialog open={banTarget !== null} onOpenChange={(open) => !open && !isBanning && setBanTarget(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="h-5 w-5" />
              Banir Usuário?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Você tem certeza que deseja banir o usuário <strong>{banTarget?.fullName}</strong> ({banTarget?.email})?
              <br /><br />
              Esta ação aplica um <strong>soft delete</strong> no cadastro: o usuário será impedido de fazer login ou realizar ações na plataforma, mas o histórico de reservas e publicações será preservado. Você poderá desbanir este usuário no futuro se desejar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBanning}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBanUser}
              disabled={isBanning}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBanning ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-4 w-4 animate-spin" /> Banindo...
                </span>
              ) : (
                'Confirmar Banimento'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}