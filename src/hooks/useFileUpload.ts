import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseFileUploadProps {
  bucket: string;
  path?: string;
}

export function useFileUpload({ bucket, path = '' }: UseFileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadFile = async (file: File, userId?: string): Promise<string | null> => {
    try {
      setUploading(true);

      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      // Construir caminho do arquivo
      const filePath = userId ? `${userId}/${fileName}` : `${path}/${fileName}`;

      // Upload do arquivo
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      toast({
        title: "Upload realizado",
        description: "Arquivo enviado com sucesso!"
      });

      return urlData.publicUrl;
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive"
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (filePath: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) throw error;

      toast({
        title: "Arquivo removido",
        description: "Arquivo removido com sucesso!"
      });

      return true;
    } catch (error: any) {
      console.error('Erro ao remover arquivo:', error);
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    uploadFile,
    deleteFile,
    uploading
  };
}