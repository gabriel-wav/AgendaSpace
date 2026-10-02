/**
 * useFileUpload.ts
 *
 * Hook para upload de arquivos via NestJS API (multipart/form-data).
 * Substitui o hook legado que dependia do Supabase Storage.
 *
 * O backend deve expor:
 *   POST /upload/:bucket  → { url: string }
 */

import { useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface UseFileUploadReturn {
  uploadFile: (file: File, bucket: 'spaces' | 'avatars' | 'feed') => Promise<string | null>;
  uploading: boolean;
}

export function useFileUpload(): UseFileUploadReturn {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadFile = async (file: File, bucket: 'spaces' | 'avatars' | 'feed'): Promise<string | null> => {
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Axios injeta o Bearer token via interceptor em api.ts
      const { data } = await api.post<{ url: string }>(
        `/upload/${bucket}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      return data.url;
    } catch (err: any) {
      toast({
        title: 'Erro no upload',
        description: err.response?.data?.message ?? err.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploadFile, uploading };
}
