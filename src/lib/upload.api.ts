/**
 * upload.api.ts
 *
 * Chamadas à API de Upload consumindo o backend NestJS.
 */

import { api } from '@/lib/api';

export interface UploadResponse {
  url: string;
  path?: string;
}

/**
 * POST /upload/:bucket
 * Faz o upload de um arquivo.
 * Requer FormData com o arquivo.
 */
export async function uploadImage(file: File, bucket: 'avatars' | 'spaces' | 'feed' = 'spaces'): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await api.post<UploadResponse>(`/upload/${bucket}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return data;
}
