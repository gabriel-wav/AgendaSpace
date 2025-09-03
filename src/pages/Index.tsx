import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Calendar, Shield, Zap, Star, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light to-background">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-primary">AgendaSpace</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="outline">Entrar</Button>
            </Link>
            <Link to="/register">
              <Button>Cadastrar</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-foreground mb-6">
            Gestão Inteligente de<br />
            <span className="text-primary">Espaços Compartilhados</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Reserve, gerencie e otimize o uso de espaços de trabalho com nossa plataforma completa e intuitiva
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="px-8">
                <Calendar className="mr-2 h-5 w-5" />
                Começar Agora
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg" className="px-8">
                Fazer Login
              </Button>
            </Link>
          </div>
        </div>

        {/* Social Proof */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500 fill-current" />
              <span className="font-medium">4.9/5</span>
              <span className="text-muted-foreground">avaliação média</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <span className="font-medium">500+</span>
              <span className="text-muted-foreground">reservas realizadas</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span className="font-medium">50+</span>
              <span className="text-muted-foreground">espaços cadastrados</span>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Building2 className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Gestão de Espaços</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Cadastre e gerencie todos os seus espaços com informações detalhadas, recursos disponíveis e preços flexíveis
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Calendar className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Reservas em Tempo Real</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Sistema de reservas inteligente com verificação de disponibilidade automática e prevenção de conflitos
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Controle de Acesso</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Sistema robusto de autenticação com diferentes níveis de acesso e segurança avançada para administradores
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Benefits Section */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold mb-4">Por que escolher o AgendaSpace?</h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Uma solução completa e intuitiva para otimizar o uso de espaços compartilhados
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-3 rounded-lg">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold mb-2">Rápido e Eficiente</h4>
                <p className="text-muted-foreground">
                  Interface intuitiva que permite fazer reservas em segundos, com confirmação automática.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-3 rounded-lg">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold mb-2">Agenda Inteligente</h4>
                <p className="text-muted-foreground">
                  Visualize disponibilidade em tempo real e evite conflitos com nossa agenda inteligente.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-3 rounded-lg">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold mb-2">Seguro e Confiável</h4>
                <p className="text-muted-foreground">
                  Seus dados estão protegidos com criptografia de ponto a ponto e backup automático.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-3 rounded-lg">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold mb-2">Gestão Completa</h4>
                <p className="text-muted-foreground">
                  Relatórios detalhados, métricas de ocupação e controle total sobre seus espaços.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t">
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">
            © 2024 AgendaSpace. Desenvolvido com ❤️ para otimizar seu espaço de trabalho.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
