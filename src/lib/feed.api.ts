/**
 * feed.api.ts
 *
 * Chamadas à API do Feed consumindo o backend NestJS.
 */

import { api } from '@/lib/api';

export interface Comment {
  _id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  id: string;
  space: { id: string; name: string };
  author: { id: string; name: string; avatarUrl?: string };
  imageUrl?: string;
  content: string;
  likesCount: number;
  likedByMe: boolean;
  totalComments: number;
  recentComments: Comment[];
  createdAt: string;
}

export interface CreatePostPayload {
  spaceId: string;
  imageUrl?: string;
  content: string;
}

export interface CreateCommentPayload {
  content: string;
}

/**
 * GET /feed/posts
 * Retorna o feed global paginado.
 */
export async function fetchGlobalPosts(cursor?: string): Promise<Post[]> {
  const url = cursor ? `/feed/posts?cursor=${cursor}` : '/feed/posts';
  const { data } = await api.get<Post[]>(url);
  return data;
}

/**
 * GET /feed/spaces/:spaceId
 * Retorna o feed de publicações de um espaço específico.
 */
export async function fetchFeedBySpace(spaceId: string, cursor?: string): Promise<Post[]> {
  const url = cursor ? `/feed/spaces/${spaceId}?cursor=${cursor}` : `/feed/spaces/${spaceId}`;
  const { data } = await api.get<Post[]>(url);
  return data;
}

/**
 * POST /feed/posts
 * Publica uma nova foto/post vinculada a um espaço.
 */
export async function createPost(payload: CreatePostPayload): Promise<Post> {
  const { data } = await api.post<Post>('/feed/posts', payload);
  return data;
}

/**
 * POST /feed/posts/:postId/like
 * Adiciona ou remove curtida de uma publicação.
 */
export async function toggleLike(postId: string): Promise<{ message: string; totalLikes: number; liked: boolean }> {
  const { data } = await api.post(`/feed/posts/${postId}/like`);
  return data;
}

/**
 * POST /feed/posts/:postId/comments
 * Adiciona um comentário a uma publicação.
 */
export async function createComment(postId: string, payload: CreateCommentPayload): Promise<Comment> {
  const { data } = await api.post<Comment>(`/feed/posts/${postId}/comments`, payload);
  return data;
}

/**
 * DELETE /feed/posts/:postId
 */
export async function deletePost(postId: string): Promise<{ success: boolean }> {
  const { data } = await api.delete(`/feed/posts/${postId}`);
  return data;
}

/**
 * DELETE /feed/comments/:commentId
 */
export async function deleteComment(commentId: string): Promise<{ success: boolean }> {
  const { data } = await api.delete(`/feed/comments/${commentId}`);
  return data;
}
