import React, { useState, useCallback, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PostCard } from '@/components/feed/PostCard';
import { NewPostInput } from '@/components/feed/NewPostInput';
import { useAuth } from '@/contexts/AuthContext';
import type { FeedPost } from '@/components/feed/feed.types';
import { useFileUpload } from '@/hooks/useFileUpload';
import { fetchGlobalPosts, toggleLike as apiToggleLike, createComment as apiCreateComment, createPost as apiCreatePost, deletePost as apiDeletePost, hidePost as apiHidePost, reportPost as apiReportPost, deleteComment as apiDeleteComment, unhidePost as apiUnhidePost } from '@/lib/feed.api';
import { fetchSpaces } from '@/lib/spaces.api';
import { useToast } from '@/hooks/use-toast';
import { CommentsDrawer } from '@/components/feed/CommentsDrawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export default function FeedPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<string>('Spam');
  const [isReporting, setIsReporting] = useState(false);
  const { uploadFile } = useFileUpload();

  // Load spaces and initial posts
  useEffect(() => {
    async function loadData() {
      try {
        const [spacesData, postsData] = await Promise.all([
          fetchSpaces(true), // only active
          fetchGlobalPosts()
        ]);
        setSpaces(spacesData);
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
      if (!url) {
        throw new Error('Falha no upload da imagem.');
      }

      try {
        await apiCreatePost({
          spaceId,
          content,
          imageUrl: url,
        });

        // Recarrega todo o feed para obter os relacionamentos enriquecidos do banco
        const postsData = await fetchGlobalPosts();
        setPosts(postsData as unknown as FeedPost[]);
        toast({ title: 'Sucesso', description: 'Publicação criada!' });
      } catch (error: any) {
        toast({ title: 'Erro', description: error.response?.data?.message || 'Não foi possível criar publicação.', variant: 'destructive' });
        throw error; // Let NewPostInput know it failed
      }
    },
    [uploadFile, toast]
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

  // Delete a comment
  const handleDeleteComment = useCallback(async (postId: string, commentId: string) => {
    try {
      await apiDeleteComment(commentId);
      // Revalide a prévia para recuperar o próximo mais recente
      const postsData = await fetchGlobalPosts();
      setPosts(postsData as unknown as FeedPost[]);
      toast({ title: 'Sucesso', description: 'Comentário excluído.' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.response?.data?.message || 'Não foi possível excluir o comentário.', variant: 'destructive' });
    }
  }, [toast]);

  // Hide a post
  const handleHidePost = useCallback(async (postId: string) => {
    const postToHide = posts.find(p => p.id === postId);
    if (!postToHide) return;

    setPosts((prev) => prev.filter(p => p.id !== postId));
    
    try {
      await apiHidePost(postId);
      toast({
        title: 'Ocultada',
        description: 'Você não verá mais esta publicação.',
        action: (
          <button 
            className="text-xs underline font-semibold transition-opacity hover:opacity-70"
            onClick={async () => {
              try {
                await apiUnhidePost(postId);
                setPosts(prev => {
                  const newPosts = [...prev, postToHide];
                  return newPosts.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                });
              } catch(e) {
                toast({ title: 'Erro', description: 'Não foi possível restaurar a publicação.', variant: 'destructive' });
              }
            }}
          >
            Desfazer
          </button>
        )
      });
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível ocultar a publicação.', variant: 'destructive' });
      setPosts(prev => {
        const newPosts = [...prev, postToHide];
        return newPosts.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      });
    }
  }, [posts, toast]);

  // Report a post
  const handleReportPost = useCallback((postId: string) => {
    setReportingPostId(postId);
    setReportReason('Spam');
  }, []);

  const submitReport = async () => {
    if (!reportingPostId) return;
    setIsReporting(true);
    try {
      await apiReportPost(reportingPostId, reportReason);
      toast({ title: 'Denunciada', description: 'A publicação foi enviada para análise.' });
      setReportingPostId(null);
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível denunciar a publicação.', variant: 'destructive' });
    } finally {
      setIsReporting(false);
    }
  };

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
          {posts.map((post) => {
            const canDelete = user?.role === 'ADMIN' || user?.id === post.author.id;
            return (
              <PostCard
                key={post.id}
                post={post}
                onLike={handleLike}
                onComment={handleComment}
                onDelete={canDelete ? handleDeletePost : undefined}
                onDeleteComment={handleDeleteComment}
                onHide={user ? handleHidePost : undefined}
                onReport={user ? handleReportPost : undefined}
                onViewAllComments={setSelectedPostId}
                currentUser={user}
              />
            );
          })}
        </div>
      )}

      {selectedPostId && (
        <CommentsDrawer
          postId={selectedPostId}
          totalComments={posts.find(p => p.id === selectedPostId)?.totalComments || 0}
          isOpen={!!selectedPostId}
          onClose={() => setSelectedPostId(null)}
          onDeleteComment={(commentId) => handleDeleteComment(selectedPostId, commentId)}
          currentUser={user}
        />
      )}

      {/* Dialog for Reporting */}
      <Dialog open={!!reportingPostId} onOpenChange={(open) => !open && !isReporting && setReportingPostId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Denunciar publicação</DialogTitle>
            <DialogDescription>
              Por que você está denunciando esta publicação? Nossa equipe analisará sua denúncia.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {!posts.find(p => p.id === reportingPostId) && (
              <p className="text-sm text-amber-600 mb-4">Atenção: Esta publicação não está mais visível no seu feed.</p>
            )}
            <RadioGroup value={reportReason} onValueChange={setReportReason} className="space-y-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Spam" id="r1" />
                <Label htmlFor="r1" className="cursor-pointer">Spam</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Conteúdo ofensivo" id="r2" />
                <Label htmlFor="r2" className="cursor-pointer">Conteúdo ofensivo</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Conteúdo inadequado" id="r3" />
                <Label htmlFor="r3" className="cursor-pointer">Conteúdo inadequado</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Outro" id="r4" />
                <Label htmlFor="r4" className="cursor-pointer">Outro</Label>
              </div>
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReportingPostId(null)} disabled={isReporting}>Cancelar</Button>
            <Button onClick={submitReport} disabled={isReporting}>
              {isReporting ? 'Enviando...' : 'Enviar denúncia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
