import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Building2, Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Space {
  id: string;
  name: string;
  description: string;
  capacity: number;
  price_per_hour: number;
  resources: string[];
  image_url?: string;
  is_active: boolean;
  created_at: string;
}

export default function Spaces() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    capacity: '',
    price_per_hour: '',
    resources: '',
    image_url: '',
    is_active: true,
  });

  useEffect(() => {
    fetchSpaces();
  }, []);

  const fetchSpaces = async () => {
    try {
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSpaces(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar espaços",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const spaceData = {
        name: formData.name,
        description: formData.description,
        capacity: parseInt(formData.capacity),
        price_per_hour: parseFloat(formData.price_per_hour),
        resources: formData.resources.split(',').map(r => r.trim()).filter(Boolean),
        image_url: formData.image_url || null,
        is_active: formData.is_active,
      };

      if (editingSpace) {
        const { error } = await supabase
          .from('spaces')
          .update(spaceData)
          .eq('id', editingSpace.id);

        if (error) throw error;
        
        toast({
          title: "Espaço atualizado",
          description: "O espaço foi atualizado com sucesso."
        });
      } else {
        const { error } = await supabase
          .from('spaces')
          .insert([spaceData]);

        if (error) throw error;
        
        toast({
          title: "Espaço criado",
          description: "O espaço foi criado com sucesso."
        });
      }

      await fetchSpaces();
      resetForm();
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar espaço",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEdit = (space: Space) => {
    setEditingSpace(space);
    setFormData({
      name: space.name,
      description: space.description || '',
      capacity: space.capacity.toString(),
      price_per_hour: space.price_per_hour.toString(),
      resources: space.resources.join(', '),
      image_url: space.image_url || '',
      is_active: space.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este espaço?')) return;

    try {
      const { error } = await supabase
        .from('spaces')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Espaço excluído",
        description: "O espaço foi excluído com sucesso."
      });

      await fetchSpaces();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir espaço",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      capacity: '',
      price_per_hour: '',
      resources: '',
      image_url: '',
      is_active: true,
    });
    setEditingSpace(null);
  };

  const filteredSpaces = spaces.filter(space =>
    space.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    space.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando espaços...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gerenciar Espaços</h1>
            <p className="text-muted-foreground mt-1">
              Cadastre e gerencie todos os espaços disponíveis
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Espaço
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingSpace ? 'Editar Espaço' : 'Novo Espaço'}
                </DialogTitle>
                <DialogDescription>
                  Preencha as informações do espaço
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome do Espaço</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="capacity">Capacidade</Label>
                    <Input
                      id="capacity"
                      type="number"
                      value={formData.capacity}
                      onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Preço por Hora (R$)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price_per_hour}
                      onChange={(e) => setFormData({...formData, price_per_hour: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="image_url">URL da Imagem</Label>
                    <Input
                      id="image_url"
                      type="url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="resources">Recursos (separados por vírgula)</Label>
                  <Input
                    id="resources"
                    value={formData.resources}
                    onChange={(e) => setFormData({...formData, resources: e.target.value})}
                    placeholder="wifi, projetor, quadro-branco"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                  />
                  <Label htmlFor="is_active">Espaço ativo</Label>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingSpace ? 'Atualizar' : 'Criar'} Espaço
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar espaços..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Spaces Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSpaces.map((space) => (
            <Card key={space.id} className="overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                {space.image_url ? (
                  <img
                    src={space.image_url}
                    alt={space.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 className="h-16 w-16 text-primary" />
                )}
              </div>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{space.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {space.description}
                    </CardDescription>
                  </div>
                  <Badge variant={space.is_active ? "default" : "secondary"}>
                    {space.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Capacidade:</span>
                    <span className="font-medium">{space.capacity} pessoas</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Preço/hora:</span>
                    <span className="font-medium">R$ {space.price_per_hour}</span>
                  </div>
                  {space.resources.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Recursos:</p>
                      <div className="flex flex-wrap gap-1">
                        {space.resources.map((resource) => (
                          <Badge key={resource} variant="outline" className="text-xs">
                            {resource}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(space)}
                      className="flex-1"
                    >
                      <Pencil className="mr-2 h-3 w-3" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(space.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredSpaces.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum espaço encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Tente alterar os filtros de busca.' : 'Comece cadastrando seu primeiro espaço.'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Cadastrar Primeiro Espaço
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}