import React, { useState, useCallback, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PostCard } from '@/components/feed/PostCard';
import { NewPostInput } from '@/components/feed/NewPostInput';
import { useAuth } from '@/contexts/AuthContext';
import type { FeedPost } from '@/components/feed/feed.types';
import { useFileUpload } from '@/hooks/useFileUpload';
import { fetchGlobalPosts, toggleLike as apiToggleLike, createComment as apiCreateComment, createPost as apiCreatePost, deletePost as apiDeletePost } from '@/lib/feed.api';
import { fetchSpaces } from '@/lib/spaces.api';
import { useToast } from '@/hooks/use-toast';

export default function FeedPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [spaces, setSpaces] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const { uploadFile } = useFileUpload();

  // Load spaces and initial posts
  useEffect(() => {
    async function loadData() {
      try {
        const [spacesData, postsData] = await Promise.all([
          fetchSpaces(true), // only active
          fetchGlobalPosts()
        ]);
        setSpaces(spacesData.map(s => ({ id: s.id, name: s.name })));
        setPosts(postsData as unknown as FeedPost[]);
      } catch (error) {
        toast({ title: 'Erro', description: 'Não foi possível carregar o feed.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [toast]);

  // Toggle like on a post
  const handleLike = useCallback(async (postId: string) => {
    // Optimistic UI update
    let wasLiked = false;
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          wasLiked = p.likedByMe;
          return {
            ...p,
            likedByMe: !p.likedByMe,
            likesCount: p.likedByMe ? p.likesCount - 1 : p.likesCount + 1,
          };
        }
        return p;
      })
    );

    try {
      const res = await apiToggleLike(postId);
      // Optional: sync with server response if needed
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, likedByMe: res.liked, likesCount: res.totalLikes }
            : p
        )
      );
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao curtir publicação.', variant: 'destructive' });
      // Revert optimistic update
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              likedByMe: wasLiked,
              likesCount: wasLiked ? p.likesCount + 1 : p.likesCount - 1,
            };
          }
          return p;
        })
      );
    }
  }, [toast]);

  // Add a comment
  const handleComment = useCallback(
    async (postId: string, content: string) => {
      try {
        const createdComment = await apiCreateComment(postId, { content });
        
        const newComment = {
          id: (createdComment as any)._id || (createdComment as any).id,
          author: {
            id: user?.id ?? 'me',
            name: user?.fullName ?? 'Você',
            avatarUrl: user?.avatarUrl,
          },
          content,
          createdAt: createdComment.createdAt || new Date().toISOString(),
        };

        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  recentComments: [newComment, ...p.recentComments],
                  totalComments: p.totalComments + 1,
                }
              : p
          )
        );
      } catch (error) {
        toast({ title: 'Erro', description: 'Falha ao adicionar comentário.', variant: 'destructive' });
      }
    },
    [user, toast]
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
      const url = await uploadFile(imageFile, 'feed');
      if (!url) return; // Hook handles error toast

      try {
        const created = await apiCreatePost({
          spaceId,
          description: content,
          imageUrl: url,
        });

        const space = spaces.find((s) => s.id === spaceId) ?? { id: spaceId, name: '' };
        
        const newPost: FeedPost = {
          id: (created as any).id || (created as any)._id,
          author: {
            id: user?.id ?? 'me',
            name: user?.fullName ?? 'Você',
            avatarUrl: user?.avatarUrl,
          },
          space,
          imageUrl: url,
          content: created.content || content,
          likesCount: 0,
          likedByMe: false,
          totalComments: 0,
          recentComments: [],
          createdAt: created.createdAt || new Date().toISOString(),
        };

        setPosts((prev) => [newPost, ...prev]);
        toast({ title: 'Sucesso', description: 'Publicação criada!' });
      } catch (error) {
        toast({ title: 'Erro', description: 'Não foi possível criar publicação.', variant: 'destructive' });
      }
    },
    [user, uploadFile, spaces, toast]
  );

  // Delete a post
  const handleDeletePost = useCallback(async (postId: string) => {
    try {
      await apiDeletePost(postId);
      setPosts((prev) => prev.filter(p => p.id !== postId));
      toast({ title: 'Sucesso', description: 'Publicação excluída.' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.response?.data?.message || 'Não foi possível excluir a publicação.', variant: 'destructive' });
    }
  }, [toast]);

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
        <NewPostInput spaces={spaces} onSubmit={handleNewPost} />
      </div>

      {/* Divider with label */}
      <div className="relative mb-8">
        <div className="divider" />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-[11px] uppercase tracking-widest text-muted-foreground/50">
          Publicações recentes
        </span>
      </div>

      {/* Posts list */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
      ) : posts.length === 0 ? (
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
              onDelete={handleDeletePost}
            />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
