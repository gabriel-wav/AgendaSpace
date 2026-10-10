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
import { User, Lock, Bell, Shield, Save, AlertTriangle, KeyRound, Laptop, Smartphone, CheckCircle2, XCircle, Send, RefreshCw, BellOff, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { updateMyProfile, getMyPreferences, updateMyPreferences, UserPreferences } from '@/lib/users.api';
import { 
  isPushSupported, 
  getBrowserPushPermission, 
  getLocalPushSubscription, 
  enablePushOnCurrentDevice, 
  disablePushOnCurrentDevice, 
  getDeviceSubscriptions, 
  sendTestPush,
  BrowserPushPermission,
  DevicePushSubscription
} from '@/lib/push.api';
import { 
  changeEmailInit, changeEmailConfirm, 
  resendVerification, 
  getSecurityStatus,
  enable2FAInit, enable2FAConfirm,
  disable2FAInit, disable2FAConfirm,
  regenerateRecoveryInit, regenerateRecoveryConfirm,
  changePasswordInit, changePasswordConfirm
} from '@/lib/auth.api';
import { useToast } from '@/hooks/use-toast';
import { FileUpload } from '@/components/ui/file-upload';
import { useFileUpload } from '@/hooks/useFileUpload';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const { uploadFile, uploading } = useFileUpload();
  
  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || '',
    bio: user?.bio || '',
    phone: user?.phone || '',
    avatarUrl: user?.avatarUrl || ''
  });

  const [securityStatus, setSecurityStatus] = useState({ isTwoFactorEnabled: false, recoveryCodesRemaining: 0 });
  const [preferences, setPreferences] = useState<UserPreferences>({
    emailNotifications: true,
    emailBookings: true,
    emailReminders: true,
    loginAlerts: true,
    pushNotifications: false,
    marketingConsent: false,
    showPhone: false,
    hideFromFeed: false,
  });

  const [browserPermission, setBrowserPermission] = useState<BrowserPushPermission>('default');
  const [isDeviceSubscribed, setIsDeviceSubscribed] = useState(false);
  const [deviceSubscriptions, setDeviceSubscriptions] = useState<DevicePushSubscription[]>([]);
  const [pushLoading, setPushLoading] = useState(false);

  const checkPushState = React.useCallback(async () => {
    const perm = getBrowserPushPermission();
    setBrowserPermission(perm);

    if (perm === 'granted') {
      const sub = await getLocalPushSubscription();
      setIsDeviceSubscribed(!!sub);
    } else {
      setIsDeviceSubscribed(false);
    }

    try {
      const subs = await getDeviceSubscriptions();
      setDeviceSubscriptions(subs);
    } catch {
      // Ignora erro se não autenticado ainda
    }
  }, []);

  const fetchSecurityAndPrefs = async () => {
    try {
      const [secRes, prefRes] = await Promise.all([
        getSecurityStatus(),
        getMyPreferences()
      ]);
      setSecurityStatus(secRes);
      setPreferences(prefRes);
    } catch {}
  };

  useEffect(() => {
    if (user) {
      setProfileData({
        fullName: user.fullName || '',
        bio: user.bio || '',
        phone: user.phone || '',
        avatarUrl: user.avatarUrl || ''
      });
      fetchSecurityAndPrefs();
      checkPushState();
    }
  }, [user, checkPushState]);

  const handleEnableDevicePush = async () => {
    setPushLoading(true);
    try {
      await enablePushOnCurrentDevice();
      setPreferences(prev => ({ ...prev, pushNotifications: true }));
      await checkPushState();
      toast({
        title: "Notificações Push Ativadas",
        description: "Este dispositivo agora está inscrito e receberá alertas em segundo plano.",
      });
    } catch (err: any) {
      await checkPushState();
      toast({
        title: "Não foi possível ativar",
        description: err.message || "Falha ao ativar notificações push.",
        variant: "destructive",
      });
    } finally {
      setPushLoading(false);
    }
  };

  const handleDisableDevicePush = async () => {
    setPushLoading(true);
    try {
      await disablePushOnCurrentDevice();
      await checkPushState();
      toast({
        title: "Push Desativado neste Dispositivo",
        description: "Este dispositivo não receberá mais notificações push.",
      });
    } catch (err: any) {
      toast({
        title: "Erro ao desativar",
        description: err.message || "Falha ao desativar assinatura local.",
        variant: "destructive",
      });
    } finally {
      setPushLoading(false);
    }
  };

  const handleSendTestPush = async () => {
    setPushLoading(true);
    try {
      await sendTestPush();
      toast({
        title: "Notificação de Teste Enviada",
        description: "Se o navegador permitir segundo plano, o alerta aparecerá no sistema operacional.",
      });
    } catch (err: any) {
      toast({
        title: "Erro no teste de Push",
        description: err.response?.data?.message || err.message || "Falha ao disparar teste.",
        variant: "destructive",
      });
    } finally {
      setPushLoading(false);
    }
  };

  // General states for Dialogs
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [step, setStep] = useState<'INIT' | 'CONFIRM' | 'SUCCESS'>('INIT');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [useRecovery, setUseRecovery] = useState(false);

  const resetDialogStates = () => {
    setPassword('');
    setCode('');
    setChallengeId('');
    setStep('INIT');
    setUseRecovery(false);
  };

  // Profile Save
  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      let updatedData: any = {
        fullName: profileData.fullName,
        bio: profileData.bio,
        phone: profileData.phone,
      };

      if (avatarFile && user?.id) {
        const avatarUrl = await uploadFile(avatarFile, 'avatars');
        if (avatarUrl) {
          updatedData.avatarUrl = avatarUrl;
          setProfileData(prev => ({ ...prev, avatarUrl }));
        }
      }

      await updateMyProfile(updatedData);
      setAvatarFile(null);
      await refreshUser();
      toast({ title: "Perfil atualizado", description: "Suas informações foram salvas com sucesso." });
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      await resendVerification(user.email);
      toast({ title: "Email reenviado", description: "Verifique sua caixa de entrada." });
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao reenviar o email.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Change Email
  const [emailChangeOpen, setEmailChangeOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const handleChangeEmailInit = async () => {
    setLoading(true);
    try {
      const res = await changeEmailInit(newEmail, password);
      if (res.status === 'MFA_REQUIRED') {
        setChallengeId(res.challengeId!);
        setStep('CONFIRM');
      } else {
        toast({ title: "Sucesso", description: res.message });
        setEmailChangeOpen(false);
        resetDialogStates();
      }
    } catch (error: any) {
      toast({ title: "Erro", description: error.response?.data?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  const handleChangeEmailConfirm = async () => {
    setLoading(true);
    try {
      const res = await changeEmailConfirm(challengeId, code);
      toast({ title: "Sucesso", description: res.message });
      setEmailChangeOpen(false);
      resetDialogStates();
    } catch (error: any) {
      toast({ title: "Erro", description: error.response?.data?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Change Password
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const handleChangePasswordInit = async () => {
    setLoading(true);
    try {
      const res = await changePasswordInit(password, newPassword);
      if (res.status === 'MFA_REQUIRED') {
        setChallengeId(res.challengeId!);
        setStep('CONFIRM');
      } else {
        toast({ title: "Sucesso", description: res.message });
        setPasswordOpen(false);
        resetDialogStates();
        setNewPassword('');
      }
    } catch (error: any) {
      toast({ title: "Erro", description: error.response?.data?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  const handleChangePasswordConfirm = async () => {
    setLoading(true);
    try {
      const res = await changePasswordConfirm({ 
        challengeId, 
        code: useRecovery ? undefined : code, 
        recoveryCode: useRecovery ? code : undefined 
      });
      toast({ title: "Sucesso", description: res.message });
      setPasswordOpen(false);
      resetDialogStates();
      setNewPassword('');
    } catch (error: any) {
      toast({ title: "Erro", description: error.response?.data?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Enable 2FA
  const [enable2FAOpen, setEnable2FAOpen] = useState(false);
  const handleEnable2FAInit = async () => {
    setLoading(true);
    try {
      const res = await enable2FAInit(password);
      setChallengeId(res.challengeId);
      setStep('CONFIRM');
    } catch (error: any) {
      toast({ title: "Erro", description: error.response?.data?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  const handleEnable2FAConfirm = async () => {
    setLoading(true);
    try {
      const res = await enable2FAConfirm(challengeId, code);
      setRecoveryCodes(res.recoveryCodes);
      setStep('SUCCESS');
      fetchSecurityAndPrefs();
      refreshUser();
    } catch (error: any) {
      toast({ title: "Erro", description: error.response?.data?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Disable 2FA
  const [disable2FAOpen, setDisable2FAOpen] = useState(false);
  const handleDisable2FAInit = async () => {
    setLoading(true);
    try {
      const res = await disable2FAInit(password);
      setChallengeId(res.challengeId);
      setStep('CONFIRM');
    } catch (error: any) {
      toast({ title: "Erro", description: error.response?.data?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  const handleDisable2FAConfirm = async () => {
    setLoading(true);
    try {
      await disable2FAConfirm({
        challengeId,
        code: useRecovery ? undefined : code,
        recoveryCode: useRecovery ? code : undefined
      });
      toast({ title: "Sucesso", description: '2FA desativado.' });
      setDisable2FAOpen(false);
      resetDialogStates();
      fetchSecurityAndPrefs();
      refreshUser();
    } catch (error: any) {
      toast({ title: "Erro", description: error.response?.data?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Regenerate Recovery
  const [regenOpen, setRegenOpen] = useState(false);
  const handleRegenInit = async () => {
    setLoading(true);
    try {
      const res = await regenerateRecoveryInit(password);
      setChallengeId(res.challengeId);
      setStep('CONFIRM');
    } catch (error: any) {
      toast({ title: "Erro", description: error.response?.data?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  const handleRegenConfirm = async () => {
    setLoading(true);
    try {
      const res = await regenerateRecoveryConfirm({
        challengeId,
        code: useRecovery ? undefined : code,
        recoveryCode: useRecovery ? code : undefined
      });
      setRecoveryCodes(res.recoveryCodes);
      setStep('SUCCESS');
      fetchSecurityAndPrefs();
    } catch (error: any) {
      toast({ title: "Erro", description: error.response?.data?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground mt-1">Gerencie suas preferências e configurações da conta</p>
        </div>

        {user && !user.isVerified && (
          <div className="rounded-md border border-warning/50 bg-warning/10 p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-warning-foreground">Sua conta não está verificada</h3>
                <p className="mt-1 text-sm text-warning-foreground/80">
                  Para acessar todas as funcionalidades da plataforma, você precisa verificar seu endereço de email ({user.email}).
                </p>
                <div className="mt-3">
                  <Button variant="outline" size="sm" onClick={handleResendVerification} disabled={loading}>
                    {loading ? 'Enviando...' : 'Reenviar email de confirmação'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

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
                <CardTitle className="flex items-center"><User className="mr-2 h-5 w-5" /> Informações do Perfil</CardTitle>
                <CardDescription>Atualize suas informações pessoais e dados de contato</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-20 w-20">
                      {(profileData.avatarUrl || avatarFile) && (
                        <AvatarImage src={avatarFile ? URL.createObjectURL(avatarFile) : profileData.avatarUrl} alt="Avatar" />
                      )}
                      <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                        {profileData.fullName ? profileData.fullName.split(' ').map(n=>n[0]).join('').toUpperCase() : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">Foto do Perfil</h3>
                      <p className="text-sm text-muted-foreground">Escolha uma imagem para seu perfil. Recomendamos imagens quadradas.</p>
                    </div>
                  </div>
                  <FileUpload accept="image/*" maxSize={5} onFileSelect={setAvatarFile} preview={avatarFile ? URL.createObjectURL(avatarFile) : undefined} label="Upload de Avatar" />
                </div>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nome Completo</Label>
                    <Input id="full_name" value={profileData.fullName} onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" value={profileData.phone} onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })} placeholder="+55 (11) 99999-9999" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="bio">Biografia</Label>
                    <Textarea id="bio" value={profileData.bio} onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })} placeholder="Conte um pouco sobre você..." rows={3} />
                  </div>
                </div>
                <Button onClick={handleSaveProfile} disabled={loading || uploading}>
                  <Save className="mr-2 h-4 w-4" /> {(loading || uploading) ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><Shield className="mr-2 h-5 w-5" /> Configurações de Segurança</CardTitle>
                <CardDescription>Proteja sua conta e atualize suas credenciais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Email Change */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email atual</Label>
                    <div className="flex items-center gap-3">
                      <Input value={user?.email || ''} readOnly className="max-w-md bg-muted text-muted-foreground" />
                      <Dialog open={emailChangeOpen} onOpenChange={(o) => { setEmailChangeOpen(o); if(!o) resetDialogStates(); }}>
                        <DialogTrigger asChild><Button variant="outline">Alterar Email</Button></DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Alterar Email</DialogTitle>
                            <DialogDescription>
                              {step === 'INIT' ? 'Por segurança, precisamos da sua senha atual.' : 'Insira o código enviado.'}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            {step === 'INIT' ? (
                              <>
                                <div className="space-y-2">
                                  <Label>Novo Email</Label>
                                  <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                  <Label>Senha Atual</Label>
                                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                                </div>
                              </>
                            ) : (
                              <div className="space-y-2">
                                <Label>Código de Verificação (2FA)</Label>
                                <Input type="text" value={code} onChange={(e) => setCode(e.target.value)} />
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setEmailChangeOpen(false)}>Cancelar</Button>
                            <Button onClick={step === 'INIT' ? handleChangeEmailInit : handleChangeEmailConfirm} disabled={loading}>
                              {loading ? 'Processando...' : 'Confirmar'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    {user?.isVerified ? <p className="text-xs text-success">Endereço verificado.</p> : <p className="text-xs text-warning">Aguardando verificação.</p>}
                  </div>
                </div>

                <Separator />
                
                {/* 2FA Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Autenticação de Dois Fatores (2FA por Email)</Label>
                      <p className="text-sm text-muted-foreground">
                        Adiciona uma camada extra de segurança exigindo um código enviado por email.
                      </p>
                    </div>
                    {securityStatus.isTwoFactorEnabled ? (
                      <Dialog open={disable2FAOpen} onOpenChange={(o) => { setDisable2FAOpen(o); if(!o) resetDialogStates(); }}>
                        <DialogTrigger asChild><Button variant="destructive">Desativar</Button></DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Desativar 2FA</DialogTitle></DialogHeader>
                          <div className="space-y-4 py-4">
                            {step === 'INIT' ? (
                              <div className="space-y-2">
                                <Label>Senha Atual</Label>
                                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Label>{useRecovery ? 'Código de Recuperação' : 'Código (Email)'}</Label>
                                <Input type="text" value={code} onChange={(e) => setCode(e.target.value)} />
                                <button className="text-xs underline mt-2" onClick={() => setUseRecovery(!useRecovery)}>
                                  {useRecovery ? 'Usar código do email' : 'Usar código de recuperação'}
                                </button>
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            <Button onClick={step === 'INIT' ? handleDisable2FAInit : handleDisable2FAConfirm} disabled={loading}>Confirmar</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <Dialog open={enable2FAOpen} onOpenChange={(o) => { setEnable2FAOpen(o); if(!o) resetDialogStates(); }}>
                        <DialogTrigger asChild><Button>Ativar 2FA</Button></DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader><DialogTitle>Ativar 2FA</DialogTitle></DialogHeader>
                          <div className="space-y-4 py-4">
                            {step === 'INIT' ? (
                              <div className="space-y-2">
                                <Label>Senha Atual</Label>
                                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                              </div>
                            ) : step === 'CONFIRM' ? (
                              <div className="space-y-2">
                                <Label>Código enviado para {user?.email}</Label>
                                <Input type="text" value={code} onChange={(e) => setCode(e.target.value)} />
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <p className="text-sm font-medium text-success">2FA Ativado com sucesso!</p>
                                <p className="text-sm text-muted-foreground">Guarde estes códigos de recuperação em um local seguro. Eles são mostrados apenas uma vez.</p>
                                <div className="grid grid-cols-2 gap-2 bg-muted p-4 rounded-md text-xs font-mono">
                                  {recoveryCodes.map(c => <div key={c}>{c}</div>)}
                                </div>
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            {step === 'SUCCESS' ? (
                              <Button onClick={() => setEnable2FAOpen(false)}>Concluir</Button>
                            ) : (
                              <Button onClick={step === 'INIT' ? handleEnable2FAInit : handleEnable2FAConfirm} disabled={loading}>
                                {step === 'INIT' ? 'Avançar' : 'Confirmar'}
                              </Button>
                            )}
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                  
                  {securityStatus.isTwoFactorEnabled && (
                    <div className="pl-4 border-l-2 border-muted pt-2">
                      <p className="text-sm mb-2">Você possui {securityStatus.recoveryCodesRemaining} códigos de recuperação restantes.</p>
                      <Dialog open={regenOpen} onOpenChange={(o) => { setRegenOpen(o); if(!o) resetDialogStates(); }}>
                        <DialogTrigger asChild><Button variant="outline" size="sm"><KeyRound className="w-4 h-4 mr-2" />Regerar Códigos</Button></DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Regerar Códigos</DialogTitle></DialogHeader>
                          <div className="space-y-4 py-4">
                            {step === 'INIT' ? (
                              <div className="space-y-2">
                                <Label>Senha Atual</Label>
                                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                              </div>
                            ) : step === 'CONFIRM' ? (
                              <div className="space-y-2">
                                <Label>{useRecovery ? 'Código de Recuperação' : 'Código (Email)'}</Label>
                                <Input type="text" value={code} onChange={(e) => setCode(e.target.value)} />
                                <button className="text-xs underline mt-2" onClick={() => setUseRecovery(!useRecovery)}>
                                  {useRecovery ? 'Usar código do email' : 'Usar código de recuperação'}
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <p className="text-sm font-medium text-success">Códigos regerados!</p>
                                <div className="grid grid-cols-2 gap-2 bg-muted p-4 rounded-md text-xs font-mono">
                                  {recoveryCodes.map(c => <div key={c}>{c}</div>)}
                                </div>
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            {step === 'SUCCESS' ? (
                              <Button onClick={() => setRegenOpen(false)}>Concluir</Button>
                            ) : (
                              <Button onClick={step === 'INIT' ? handleRegenInit : handleRegenConfirm} disabled={loading}>
                                {step === 'INIT' ? 'Avançar' : 'Confirmar'}
                              </Button>
                            )}
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Change Password */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Alterar Senha</h3>
                  <Dialog open={passwordOpen} onOpenChange={(o) => { setPasswordOpen(o); if(!o) { resetDialogStates(); setNewPassword(''); } }}>
                    <DialogTrigger asChild><Button variant="outline"><Lock className="mr-2 h-4 w-4" /> Alterar Senha</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Alterar Senha</DialogTitle></DialogHeader>
                      <div className="space-y-4 py-4">
                        {step === 'INIT' ? (
                          <>
                            <div className="space-y-2">
                              <Label>Senha Atual</Label>
                              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label>Nova Senha</Label>
                              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                            </div>
                          </>
                        ) : (
                          <div className="space-y-2">
                            <Label>{useRecovery ? 'Código de Recuperação' : 'Código (Email)'}</Label>
                            <Input type="text" value={code} onChange={(e) => setCode(e.target.value)} />
                            <button className="text-xs underline mt-2" onClick={() => setUseRecovery(!useRecovery)}>
                              {useRecovery ? 'Usar código do email' : 'Usar código de recuperação'}
                            </button>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button onClick={step === 'INIT' ? handleChangePasswordInit : handleChangePasswordConfirm} disabled={loading}>
                          {step === 'INIT' ? 'Confirmar' : 'Validar Código'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="mr-2 h-5 w-5" />
                  Notificações e Privacidade
                </CardTitle>
                <CardDescription>
                  Configure como o AgendaSpace se comunica com você e com outros usuários
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Emails do Sistema (Geral)</Label>
                      <p className="text-sm text-muted-foreground">Receba alertas globais sobre sua conta</p>
                    </div>
                    <Switch 
                      checked={preferences.emailNotifications}
                      onCheckedChange={async (val) => {
                        const original = preferences.emailNotifications;
                        try {
                          setPreferences(prev => ({ ...prev, emailNotifications: val }));
                          await updateMyPreferences({ emailNotifications: val });
                        } catch (e) {
                          setPreferences(prev => ({ ...prev, emailNotifications: original }));
                          toast({ title: "Erro", description: "Falha ao salvar preferência.", variant: "destructive" });
                        }
                      }}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email de Reservas</Label>
                      <p className="text-sm text-muted-foreground">Notificações sobre status, pagamentos e cancelamentos de reservas</p>
                    </div>
                    <Switch 
                      checked={preferences.emailBookings}
                      onCheckedChange={async (val) => {
                        const original = preferences.emailBookings;
                        try {
                          setPreferences(prev => ({ ...prev, emailBookings: val }));
                          await updateMyPreferences({ emailBookings: val });
                        } catch (e) {
                          setPreferences(prev => ({ ...prev, emailBookings: original }));
                          toast({ title: "Erro", description: "Falha ao salvar preferência.", variant: "destructive" });
                        }
                      }}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Lembretes por Email</Label>
                      <p className="text-sm text-muted-foreground">Receba um lembrete antes do início da sua reserva</p>
                    </div>
                    <Switch 
                      checked={preferences.emailReminders}
                      onCheckedChange={async (val) => {
                        const original = preferences.emailReminders;
                        try {
                          setPreferences(prev => ({ ...prev, emailReminders: val }));
                          await updateMyPreferences({ emailReminders: val });
                        } catch (e) {
                          setPreferences(prev => ({ ...prev, emailReminders: original }));
                          toast({ title: "Erro", description: "Falha ao salvar preferência.", variant: "destructive" });
                        }
                      }}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Avisos de Login</Label>
                      <p className="text-sm text-muted-foreground">Ser avisado ao concluir um novo login em outro dispositivo</p>
                    </div>
                    <Switch 
                      checked={preferences.loginAlerts}
                      onCheckedChange={async (val) => {
                        const original = preferences.loginAlerts;
                        try {
                          setPreferences(prev => ({ ...prev, loginAlerts: val }));
                          await updateMyPreferences({ loginAlerts: val });
                        } catch (e) {
                          setPreferences(prev => ({ ...prev, loginAlerts: original }));
                          toast({ title: "Erro", description: "Falha ao salvar preferência.", variant: "destructive" });
                        }
                      }}
                    />
                  </div>
                  <Separator />
                  {/* Seção Completa de Web Push */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base font-semibold">Notificações Push na Conta (Global)</Label>
                        <p className="text-sm text-muted-foreground">
                          Habilita ou suprime o envio de notificações push desta conta para todos os seus dispositivos cadastrados.
                        </p>
                      </div>
                      <Switch 
                        checked={preferences.pushNotifications}
                        onCheckedChange={async (val) => {
                          const original = preferences.pushNotifications;
                          try {
                            setPreferences(prev => ({ ...prev, pushNotifications: val }));
                            await updateMyPreferences({ pushNotifications: val });
                            toast({
                              title: val ? "Push Ativado na Conta" : "Push Desativado na Conta",
                              description: val ? "Envios de push habilitados para esta conta." : "Todos os envios opcionais de push desta conta foram suprimidos.",
                            });
                          } catch (e) {
                            setPreferences(prev => ({ ...prev, pushNotifications: original }));
                            toast({ title: "Erro", description: "Falha ao salvar preferência.", variant: "destructive" });
                          }
                        }}
                      />
                    </div>

                    {/* Status deste dispositivo específico */}
                    <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Laptop className="h-5 w-5 text-primary" />
                          <span className="font-medium text-sm">Status deste Dispositivo & Navegador</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={checkPushState} 
                          title="Atualizar status"
                          className="h-8 w-8 p-0"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="rounded-md border bg-background/50 p-3 space-y-1">
                          <span className="text-xs text-muted-foreground font-semibold block uppercase">Permissão do Navegador</span>
                          {browserPermission === 'granted' && (
                            <div className="flex items-center text-emerald-600 font-medium">
                              <CheckCircle2 className="h-4 w-4 mr-1.5" />
                              Permissão Concedida
                            </div>
                          )}
                          {browserPermission === 'denied' && (
                            <div className="flex items-center text-rose-600 font-medium">
                              <XCircle className="h-4 w-4 mr-1.5" />
                              Bloqueado pelo Navegador
                            </div>
                          )}
                          {browserPermission === 'default' && (
                            <div className="flex items-center text-amber-600 font-medium">
                              <Info className="h-4 w-4 mr-1.5" />
                              Pendente (solicitado ao ativar)
                            </div>
                          )}
                          {browserPermission === 'unsupported' && (
                            <div className="flex items-center text-zinc-500 font-medium">
                              <AlertTriangle className="h-4 w-4 mr-1.5" />
                              Push Não Suportado
                            </div>
                          )}
                        </div>

                        <div className="rounded-md border bg-background/50 p-3 space-y-1">
                          <span className="text-xs text-muted-foreground font-semibold block uppercase">Inscrição deste Dispositivo</span>
                          {isDeviceSubscribed ? (
                            <div className="flex items-center text-emerald-600 font-medium">
                              <CheckCircle2 className="h-4 w-4 mr-1.5" />
                              Inscrito e Ativo
                            </div>
                          ) : (
                            <div className="flex items-center text-muted-foreground">
                              <BellOff className="h-4 w-4 mr-1.5" />
                              Não Inscrito Neste Dispositivo
                            </div>
                          )}
                        </div>
                      </div>

                      {browserPermission === 'denied' && (
                        <div className="text-xs text-rose-600 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-md flex items-start space-x-2">
                          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>
                            As notificações foram bloqueadas no seu navegador. Para ativá-las, acesse as permissões do site nas configurações do navegador e altere para <strong>Permitir</strong>.
                          </span>
                        </div>
                      )}

                      {browserPermission === 'unsupported' && (
                        <div className="text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-md flex items-start space-x-2">
                          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>
                            Este navegador não oferece suporte à Push API ou está em um modo privado estrito que restringe Service Workers.
                          </span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 pt-1">
                        {!isDeviceSubscribed ? (
                          <Button
                            size="sm"
                            disabled={pushLoading || browserPermission === 'unsupported' || browserPermission === 'denied'}
                            onClick={handleEnableDevicePush}
                          >
                            <Bell className="h-4 w-4 mr-2" />
                            {pushLoading ? 'Ativando...' : 'Ativar Notificações neste Dispositivo'}
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={pushLoading}
                              onClick={handleDisableDevicePush}
                            >
                              <BellOff className="h-4 w-4 mr-2" />
                              {pushLoading ? 'Desativando...' : 'Desativar neste Dispositivo'}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={pushLoading}
                              onClick={handleSendTestPush}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              {pushLoading ? 'Disparando...' : 'Enviar Push de Teste'}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Dispositivos cadastrados */}
                    {deviceSubscriptions.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <Label className="text-xs text-muted-foreground uppercase font-semibold">Dispositivos Vinculados à Sua Conta ({deviceSubscriptions.length})</Label>
                        <div className="space-y-1.5">
                          {deviceSubscriptions.map(sub => (
                            <div key={sub.id} className="flex items-center justify-between text-xs p-2 rounded-md border bg-background">
                              <div className="flex items-center space-x-2">
                                <Smartphone className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{sub.deviceInfo}</span>
                              </div>
                              <span className="text-muted-foreground">
                                Conectado em {new Date(sub.createdAt).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Informações técnicas e compatibilidade */}
                    <div className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-md space-y-1 border">
                      <p><strong>• HTTPS e Suporte:</strong> Notificações Web Push via Push API exigem HTTPS no ambiente publicado (ou localhost em desenvolvimento). Compatível com Chrome, Edge, Firefox e Safari 16+.</p>
                      <p><strong>• Execução em Segundo Plano:</strong> Em navegadores compatíveis, os avisos chegam mesmo com a aba fechada, desde que o sistema operacional e o navegador permitam processos em segundo plano sem restrição severa de bateria.</p>
                      <p><strong>• Segurança e Privacidade:</strong> O Service Worker não armazena tokens JWT nem faz cache de dados confidenciais do usuário. Cliques abrem exclusivamente rotas internas autorizadas.</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Novidades e Comunicação</Label>
                      <p className="text-sm text-muted-foreground">Desejo receber comunicados não essenciais e melhorias da plataforma</p>
                    </div>
                    <Switch 
                      checked={preferences.marketingConsent}
                      onCheckedChange={async (val) => {
                        const original = preferences.marketingConsent;
                        try {
                          setPreferences(prev => ({ ...prev, marketingConsent: val }));
                          await updateMyPreferences({ marketingConsent: val });
                        } catch (e) {
                          setPreferences(prev => ({ ...prev, marketingConsent: original }));
                          toast({ title: "Erro", description: "Falha ao salvar preferência.", variant: "destructive" });
                        }
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Preferências do Sistema</CardTitle>
                <CardDescription>Configurações de interface</CardDescription>
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