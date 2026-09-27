import React, { useState, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PostCard } from '@/components/feed/PostCard';
import { NewPostInput } from '@/components/feed/NewPostInput';
import { useAuth } from '@/contexts/AuthContext';
import type { FeedPost } from '@/components/feed/feed.types';

// ─── Mock data ──────────────────────────────────────────────────────────────
// Remove when wiring to real API.

const MOCK_SPACES = [
  { id: 'space-1', name: 'Coworking Central' },
  { id: 'space-2', name: 'Sala Zen' },
  { id: 'space-3', name: 'Estúdio Foto' },
  { id: 'space-4', name: 'Terraço Vista' },
];

const INITIAL_POSTS: FeedPost[] = [
  {
    id: 'post-1',
    author: { id: 'u1', name: 'Marina Hotz', avatarUrl: undefined },
    space: { id: 'space-1', name: 'Coworking Central' },
    imageUrl: '/feed-spaces.jpg',
    content: 'Ambiente perfeito para um sprint de duas semanas. A luz natural faz toda a diferença na produtividade.',
    likesCount: 42,
    likedByMe: false,
    totalComments: 7,
    recentComments: [
      {
        id: 'c1',
        author: { id: 'u2', name: 'Pedro Alves' },
        content: 'Que espaço incrível! Já reservei para o mês que vem.',
        createdAt: new Date(Date.now() - 3600 * 2 * 1000).toISOString(),
      },
      {
        id: 'c2',
        author: { id: 'u3', name: 'Sofia Teixeira' },
        content: 'A cadeira ergonômica é um luxo separado 🙌',
        createdAt: new Date(Date.now() - 1200 * 1000).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 7200 * 1000).toISOString(),
  },
  {
    id: 'post-2',
    author: { id: 'u4', name: 'Rafael Costa', avatarUrl: undefined },
    space: { id: 'space-2', name: 'Sala Zen' },
    imageUrl: '/feed-spaces.jpg',
    content: 'Reunião estratégica aqui hoje. O silêncio e a vista do bambuzal deixaram todo mundo mais criativo.',
    likesCount: 89,
    likedByMe: true,
    totalComments: 3,
    recentComments: [
      {
        id: 'c3',
        author: { id: 'u5', name: 'Fernanda Lima' },
        content: 'Esse espaço tem algo de diferente. Saio sempre renovado.',
        createdAt: new Date(Date.now() - 900 * 1000).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'post-3',
    author: { id: 'u6', name: 'Larissa Campos', avatarUrl: undefined },
    space: { id: 'space-3', name: 'Estúdio Foto' },
    imageUrl: '/feed-spaces.jpg',
    content: 'Ensaio editorial para o meu cliente de moda. O backdrop e os softboxes são profissionais de verdade.',
    likesCount: 211,
    likedByMe: false,
    totalComments: 14,
    recentComments: [
      {
        id: 'c4',
        author: { id: 'u7', name: 'Bruno Melo' },
        content: 'Você conseguiu alguma foto linda aqui, com certeza!',
        createdAt: new Date(Date.now() - 600 * 1000).toISOString(),
      },
      {
        id: 'c5',
        author: { id: 'u8', name: 'Ana Beatriz' },
        content: 'Já está na minha lista para o próximo ensaio 📸',
        createdAt: new Date(Date.now() - 300 * 1000).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
];

// ─── Feed Page ───────────────────────────────────────────────────────────────

export default function FeedPage() {
  const { profile } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>(INITIAL_POSTS);

  // Toggle like on a post
  const handleLike = useCallback((postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              likedByMe: !p.likedByMe,
              likesCount: p.likedByMe ? p.likesCount - 1 : p.likesCount + 1,
            }
          : p
      )
    );
    // TODO: Call API -> POST /feed/posts/:postId/like
  }, []);

  // Add a comment optimistically
  const handleComment = useCallback(
    (postId: string, content: string) => {
      const newComment = {
        id: `c-${Date.now()}`,
        author: {
          id: profile?.id ?? 'me',
          name: profile?.full_name ?? 'Você',
          avatarUrl: profile?.avatar_url,
        },
        content,
        createdAt: new Date().toISOString(),
      };

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                recentComments: [...p.recentComments, newComment],
                totalComments: p.totalComments + 1,
              }
            : p
        )
      );
      // TODO: Call API -> POST /feed/posts/:postId/comments
    },
    [profile]
  );

  // Create a new post
  const handleNewPost = useCallback(
    async ({
      spaceId,
      content,
      imageFile,
    }: {
      spaceId: string;
      content: string;
      imageFile: File;
    }) => {
      // TODO: Upload image + call API -> POST /feed/posts
      // For now, create a local preview
      const space = MOCK_SPACES.find((s) => s.id === spaceId) ?? MOCK_SPACES[0];
      const newPost: FeedPost = {
        id: `post-${Date.now()}`,
        author: {
          id: profile?.id ?? 'me',
          name: profile?.full_name ?? 'Você',
          avatarUrl: profile?.avatar_url,
        },
        space,
        imageUrl: URL.createObjectURL(imageFile),
        content,
        likesCount: 0,
        likedByMe: false,
        totalComments: 0,
        recentComments: [],
        createdAt: new Date().toISOString(),
      };

      setPosts((prev) => [newPost, ...prev]);
    },
    [profile]
  );

  return (
    <AppLayout maxWidth="2xl">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Feed</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Fotos e experiências dos espaços da comunidade.
        </p>
      </div>

      {/* New post input */}
      <div className="mb-8">
        <NewPostInput spaces={MOCK_SPACES} onSubmit={handleNewPost} />
      </div>

      {/* Divider with label */}
      <div className="relative mb-8">
        <div className="divider" />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-[11px] uppercase tracking-widest text-muted-foreground/50">
          Publicações recentes
        </span>
      </div>

      {/* Posts list */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <span className="text-2xl">📷</span>
          </div>
          <p className="text-sm font-medium text-foreground">Nenhuma publicação ainda</p>
          <p className="text-xs text-muted-foreground">
            Seja o primeiro a compartilhar um espaço incrível.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={handleLike}
              onComment={handleComment}
            />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
