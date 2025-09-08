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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileUpload } from '@/components/ui/file-upload';
import { useFileUpload } from '@/hooks/useFileUpload';

export default function Settings() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const { uploadFile, uploading } = useFileUpload({ bucket: 'avatars' });
  const [profileData, setProfileData] = useState({
    full_name: profile?.full_name || '',
    email: profile?.email || '',
    bio: '',
    phone: '',
    avatar_url: profile?.avatar_url || ''
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
    if (profile) {
      setProfileData({
        full_name: profile.full_name || '',
        email: profile.email || '',
        bio: '',
        phone: '',
        avatar_url: profile.avatar_url || ''
      });
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      let updatedData: any = {
        full_name: profileData.full_name,
        email: profileData.email
      };

      // Se há um novo avatar para upload
      if (avatarFile && user?.id) {
        const avatarUrl = await uploadFile(avatarFile, user.id);
        if (avatarUrl) {
          updatedData.avatar_url = avatarUrl;
          setProfileData(prev => ({ ...prev, avatar_url: avatarUrl }));
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update(updatedData)
        .eq('id', user?.id);

      if (error) throw error;

      setAvatarFile(null);
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
                      {(profileData.avatar_url || avatarFile) && (
                        <AvatarImage 
                          src={avatarFile ? URL.createObjectURL(avatarFile) : profileData.avatar_url} 
                          alt="Avatar"
                        />
                      )}
                      <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                        {profileData.full_name ? getInitials(profileData.full_name) : 'U'}
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
                      value={profileData.full_name}
                      onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
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
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Conta</Label>
                    <div className="px-3 py-2 bg-muted rounded-md">
                      <span className="text-sm font-medium">
                        {profile?.role === 'admin' ? 'Administrador' : 'Usuário'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Biografia</Label>
                  <Textarea
                    id="bio"
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    placeholder="Conte um pouco sobre você..."
                    rows={3}
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
                  Preferências de Notificação
                </CardTitle>
                <CardDescription>
                  Configure como você gostaria de receber notificações
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notificações de Reserva</Label>
                      <p className="text-sm text-muted-foreground">
                        Receba emails sobre suas reservas (confirmações, lembretes)
                      </p>
                    </div>
                    <Switch
                      checked={notifications.email_bookings}
                      onCheckedChange={(checked) => 
                        setNotifications({ ...notifications, email_bookings: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Lembretes de Reserva</Label>
                      <p className="text-sm text-muted-foreground">
                        Receba lembretes por email antes das suas reservas
                      </p>
                    </div>
                    <Switch
                      checked={notifications.email_reminders}
                      onCheckedChange={(checked) => 
                        setNotifications({ ...notifications, email_reminders: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notificações Push</Label>
                      <p className="text-sm text-muted-foreground">
                        Receba notificações push no seu navegador
                      </p>
                    </div>
                    <Switch
                      checked={notifications.push_notifications}
                      onCheckedChange={(checked) => 
                        setNotifications({ ...notifications, push_notifications: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Emails de Marketing</Label>
                      <p className="text-sm text-muted-foreground">
                        Receba novidades e promoções especiais
                      </p>
                    </div>
                    <Switch
                      checked={notifications.marketing_emails}
                      onCheckedChange={(checked) => 
                        setNotifications({ ...notifications, marketing_emails: checked })
                      }
                    />
                  </div>
                </div>

                <Button>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Preferências
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5" />
                  Configurações de Segurança
                </CardTitle>
                <CardDescription>
                  Gerencie a segurança da sua conta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Autenticação de Dois Fatores</Label>
                      <p className="text-sm text-muted-foreground">
                        Adicione uma camada extra de segurança à sua conta
                      </p>
                    </div>
                    <Switch
                      checked={security.two_factor_enabled}
                      onCheckedChange={(checked) => 
                        setSecurity({ ...security, two_factor_enabled: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notificações de Login</Label>
                      <p className="text-sm text-muted-foreground">
                        Receba emails quando alguém fizer login na sua conta
                      </p>
                    </div>
                    <Switch
                      checked={security.login_notifications}
                      onCheckedChange={(checked) => 
                        setSecurity({ ...security, login_notifications: checked })
                      }
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Alterar Senha</h3>
                  <p className="text-sm text-muted-foreground">
                    Atualize sua senha regularmente para manter sua conta segura
                  </p>
                  <Button variant="outline">
                    <Lock className="mr-2 h-4 w-4" />
                    Alterar Senha
                  </Button>
                </div>

                <Button>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Configurações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Preferências do Sistema</CardTitle>
                <CardDescription>
                  Configure como você quer usar o AgendaSpace
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label>Idioma</Label>
                    <select className="w-full mt-1 px-3 py-2 border border-input rounded-md">
                      <option value="pt-BR">Português (Brasil)</option>
                      <option value="en-US">English (US)</option>
                      <option value="es-ES">Español</option>
                    </select>
                  </div>

                  <div>
                    <Label>Fuso Horário</Label>
                    <select className="w-full mt-1 px-3 py-2 border border-input rounded-md">
                      <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                      <option value="America/New_York">New York (GMT-5)</option>
                      <option value="Europe/London">London (GMT+0)</option>
                    </select>
                  </div>

                  <div>
                    <Label>Formato de Data</Label>
                    <select className="w-full mt-1 px-3 py-2 border border-input rounded-md">
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Modo Escuro Automático</Label>
                      <p className="text-sm text-muted-foreground">
                        Alterna automaticamente entre modo claro e escuro
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>

                <Button>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Preferências
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}