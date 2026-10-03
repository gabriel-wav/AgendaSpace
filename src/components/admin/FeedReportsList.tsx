import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getReports, resolveReport, discardReport } from '@/lib/feed.api';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Report {
  id: string;
  postId: string;
  reporter: { name: string; email: string } | null;
  reason: string;
  description?: string;
  status: string;
  createdAt: string;
  postPreview: { content: string; imageUrl: string } | null;
}

export function FeedReportsList() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await getReports();
      setReports(data.items);
    } catch (e) {
      toast({ title: 'Erro', description: 'Não foi possível carregar denúncias.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleResolve = async (id: string) => {
    try {
      await resolveReport(id);
      toast({ title: 'Resolvido', description: 'Publicação excluída e denúncia resolvida.' });
      setReports(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      toast({ title: 'Erro', description: 'Não foi possível resolver.', variant: 'destructive' });
    }
  };

  const handleDiscard = async (id: string) => {
    try {
      await discardReport(id);
      toast({ title: 'Descartada', description: 'Denúncia ignorada com sucesso.' });
      setReports(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      toast({ title: 'Erro', description: 'Não foi possível descartar.', variant: 'destructive' });
    }
  };

  if (loading) return <div className="p-4 text-center">Carregando denúncias...</div>;

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Nenhuma denúncia pendente.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reports.map(report => (
        <Card key={report.id}>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  Denúncia: {report.reason}
                  <Badge variant="outline" className="text-yellow-600 bg-yellow-50">{report.status}</Badge>
                </CardTitle>
                <CardDescription>
                  Por {report.reporter?.name} ({report.reporter?.email}) em {format(new Date(report.createdAt), "dd 'de' MMM, yyyy", { locale: ptBR })}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleDiscard(report.id)}>Descartar</Button>
                <Button variant="destructive" size="sm" onClick={() => handleResolve(report.id)}>Remover Post</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {report.postPreview ? (
              <div className="bg-muted p-3 rounded-md flex gap-3">
                {report.postPreview.imageUrl && (
                  <img src={report.postPreview.imageUrl} className="w-16 h-16 object-cover rounded" alt="Preview" />
                )}
                <div className="text-sm line-clamp-3">{report.postPreview.content}</div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Post já removido ou indisponível.</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
