import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Lock, Bell, Shield, Save, Camera } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { FileUpload } from '@/components/ui/file-upload';
import { useFileUpload } from '@/hooks/useFileUpload';

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const { uploadFile, uploading } = useFileUpload();
  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    bio: '',
    phone: '',
    avatarUrl: user?.avatarUrl || ''
  });

  const [notifications, setNotifications] = useState({
    email_bookings: true,
    email_reminders: true,
    push_notifications: false,
    marketing_emails: false
  });

  const [security, setSecurity] = useState({
    two_factor_enabled: false,
    login_notifications: true,
    session_timeout: '24'
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        fullName: user.fullName || '',
        email: user.email || '',
        bio: '',
        phone: '',
        avatarUrl: user.avatarUrl || ''
      });
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      let updatedData: any = {
        fullName: profileData.fullName,
        email: profileData.email
      };

      if (avatarFile && user?.id) {
        const avatarUrl = await uploadFile(avatarFile, 'avatars');
        if (avatarUrl) {
          updatedData.avatarUrl = avatarUrl;
          setProfileData(prev => ({ ...prev, avatarUrl }));
        }
      }

      await api.patch(`/profiles/${user?.id}`, updatedData);

      setAvatarFile(null);

      // Refresh the user context so header avatar/name updates immediately
      await refreshUser();

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso."
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie suas preferências e configurações da conta
          </p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="notifications">Notificações</TabsTrigger>
            <TabsTrigger value="security">Segurança</TabsTrigger>
            <TabsTrigger value="preferences">Preferências</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Informações do Perfil
                </CardTitle>
                <CardDescription>
                  Atualize suas informações pessoais e dados de contato
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-20 w-20">
                      {(profileData.avatarUrl || avatarFile) && (
                        <AvatarImage 
                          src={avatarFile ? URL.createObjectURL(avatarFile) : profileData.avatarUrl} 
                          alt="Avatar"
                        />
                      )}
                      <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                        {profileData.fullName ? getInitials(profileData.fullName) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">Foto do Perfil</h3>
                      <p className="text-sm text-muted-foreground">
                        Escolha uma imagem para seu perfil. Recomendamos imagens quadradas.
                      </p>
                    </div>
                  </div>
                  
                  <FileUpload
                    accept="image/*"
                    maxSize={5}
                    onFileSelect={setAvatarFile}
                    preview={avatarFile ? URL.createObjectURL(avatarFile) : undefined}
                    label="Upload de Avatar"
                    description="Selecione uma foto de perfil (JPG, PNG ou WEBP)"
                  />
                </div>

                <Separator />

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nome Completo</Label>
                    <Input
                      id="full_name"
                      value={profileData.fullName}
                      onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone (Em breve)</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      placeholder="(11) 99999-9999"
                      disabled
                      title="Campo não implementado no banco de dados atual."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Conta</Label>
                    <div className="px-3 py-2 bg-muted rounded-md">
                      <span className="text-sm font-medium">
                        {user?.role === 'ADMIN' ? 'Administrador' : 'Usuário'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Biografia (Em breve)</Label>
                  <Textarea
                    id="bio"
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    placeholder="Conte um pouco sobre você..."
                    rows={3}
                    disabled
                    title="Campo não implementado no banco de dados atual."
                  />
                </div>

                <Button onClick={handleSaveProfile} disabled={loading || uploading}>
                  <Save className="mr-2 h-4 w-4" />
                  {(loading || uploading) ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="mr-2 h-5 w-5" />
                  Preferências de Notificação (Não Disponível)
                </CardTitle>
                <CardDescription>
                  Serviço de envio de emails e push notifications ainda não está integrado.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between opacity-60">
                    <div className="space-y-0.5">
                      <Label>Notificações de Reserva</Label>
                      <p className="text-sm text-muted-foreground">
                        Receba emails sobre suas reservas
                      </p>
                    </div>
                    <Switch disabled checked={false} />
                  </div>
                  {/* ...outros desativados... */}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5" />
                  Configurações de Segurança (Não Disponível)
                </CardTitle>
                <CardDescription>
                  Funcionalidades avançadas de segurança não implementadas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4 opacity-60">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Autenticação de Dois Fatores</Label>
                      <p className="text-sm text-muted-foreground">
                        Indisponível no momento
                      </p>
                    </div>
                    <Switch disabled checked={false} />
                  </div>
                </div>
                <Separator />
                <div className="space-y-4 opacity-60">
                  <h3 className="text-lg font-medium">Alterar Senha</h3>
                  <Button variant="outline" disabled title="Rota de alteração de senha ainda não implementada no backend.">
                    <Lock className="mr-2 h-4 w-4" />
                    Alterar Senha
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Preferências do Sistema (Não Disponível)</CardTitle>
                <CardDescription>
                  Não armazenamos preferências locais em banco de dados ainda.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 opacity-60 pointer-events-none">
                <div className="space-y-4">
                  <div>
                    <Label>Idioma</Label>
                    <select className="w-full mt-1 px-3 py-2 border border-input rounded-md" disabled>
                      <option value="pt-BR">Português (Brasil)</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}