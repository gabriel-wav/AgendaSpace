import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fetchPostComments, PaginatedComments } from '@/lib/feed.api';
import { Loader2 } from 'lucide-react';
import { getAbsoluteImageUrl } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// Local helpers (duplicated from PostCard for simplicity)
function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

interface CommentsDrawerProps {
  postId: string | null;
  totalComments: number;
  isOpen: boolean;
  onClose: () => void;
  onDeleteComment?: (commentId: string) => void;
  currentUser?: any;
}

export function CommentsDrawer({ postId, totalComments, isOpen, onClose, onDeleteComment, currentUser }: CommentsDrawerProps) {
  const [items, setItems] = useState<PaginatedComments['items']>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadMore = () => {
    if (!postId || loading) return;
    setLoading(true);
    fetchPostComments(postId, nextCursor || undefined, 10)
      .then((res) => {
        setItems(prev => {
          // avoid duplicates when fetching next page
          const existingIds = new Set(prev.map(c => c.id));
          const newItems = res.items.filter(c => !existingIds.has(c.id));
          return [...prev, ...newItems];
        });
        setNextCursor(res.nextCursor);
        setHasMore(res.hasMore);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isOpen || !postId) return;
    loadMore();
  }, [isOpen, postId]);

  useEffect(() => {
    if (!isOpen) {
      setItems([]);
      setNextCursor(null);
      setHasMore(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-full max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle>Comentários ({totalComments || 0})</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {items.map((comment) => (
            <div key={comment.id} className="flex gap-3 group/comment">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={getAbsoluteImageUrl(comment.author.avatarUrl)} />
                <AvatarFallback className="text-xs">{initials(comment.author.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="bg-muted/50 rounded-lg p-2.5">
                  <p className="text-sm font-semibold">{comment.author.name}</p>
                  <p className="text-sm mt-0.5">{comment.content}</p>
                </div>
                <div className="flex items-center gap-3 mt-1 ml-1">
                  <p className="text-xs text-muted-foreground">{timeAgo(comment.createdAt)}</p>
                  {(currentUser?.role === 'ADMIN' || currentUser?.id === comment.author.id) && onDeleteComment && (
                    <button
                      onClick={() => {
                        onDeleteComment(comment.id);
                        setItems(prev => prev.filter(c => c.id !== comment.id));
                      }}
                      className="text-[10px] text-destructive/70 hover:text-destructive opacity-0 group-hover/comment:opacity-100 transition-opacity"
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {!loading && items.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">Nenhum comentário ainda.</p>
          )}

          {loading && (
            <div className="flex justify-center p-4">
              <Loader2 className="animate-spin text-muted-foreground h-6 w-6" />
            </div>
          )}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button 
                onClick={loadMore}
                disabled={loading}
                className="text-sm text-primary hover:underline"
              >
                Carregar mais comentários
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
