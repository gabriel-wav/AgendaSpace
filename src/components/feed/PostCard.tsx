import React, { useState } from 'react';
import { Heart, MessageCircle, MoreHorizontal, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { FeedPost, FeedComment } from './feed.types';
import { getAbsoluteImageUrl } from '@/lib/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Trash2, EyeOff, Flag } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)     return 'agora';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

// ─── Micro-avatar ─────────────────────────────────────────────────────────

function MicroAvatar({ author, size = 24 }: { author: { name: string; avatarUrl?: string }; size?: number }) {
  return (
    <Avatar style={{ width: size, height: size }} className="shrink-0 ring-1 ring-border/60">
      {author.avatarUrl && <AvatarImage src={getAbsoluteImageUrl(author.avatarUrl)} alt={author.name} />}
      <AvatarFallback
        style={{ fontSize: size * 0.38 }}
        className="bg-muted font-medium text-muted-foreground"
      >
        {initials(author.name)}
      </AvatarFallback>
    </Avatar>
  );
}

// ─── Like button with micro-animation ─────────────────────────────────────

function LikeButton({
  liked,
  count,
  onToggle,
}: {
  liked: boolean;
  count: number;
  onToggle: () => void;
}) {
  const [animating, setAnimating] = useState(false);

  const handleClick = () => {
    setAnimating(true);
    onToggle();
    // Reset animation flag after it plays
    setTimeout(() => setAnimating(false), 400);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'group flex items-center gap-1.5 transition-colors duration-150',
        liked ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'
      )}
      aria-label={liked ? 'Descurtir' : 'Curtir'}
    >
      <Heart
        className={cn(
          'h-5 w-5 transition-transform duration-200',
          liked && 'fill-current',
          animating && 'scale-[1.35]',
          !animating && 'scale-100',
        )}
        strokeWidth={1.5}
      />
      {count > 0 && (
        <span className="text-xs tabular-nums">{count}</span>
      )}
    </button>
  );
}

// ─── Single comment row ────────────────────────────────────────────────────

function CommentRow({ comment, canDelete, onDelete }: { comment: FeedComment; canDelete?: boolean; onDelete?: () => void }) {
  return (
    <div className="flex gap-2.5 group/comment">
      <MicroAvatar author={comment.author} size={20} />
      <div className="flex-1 min-w-0">
        <span className="text-xs font-semibold text-foreground mr-1.5">
          {comment.author.name.split(' ')[0]}
        </span>
        <span className="text-xs text-muted-foreground leading-snug">
          {comment.content}
        </span>
      </div>
      <div className="flex gap-1.5 items-start pt-0.5">
        {canDelete && onDelete && (
          <button onClick={onDelete} className="opacity-0 group-hover/comment:opacity-100 transition-opacity text-destructive hover:text-destructive/80" aria-label="Excluir">
            <Trash2 className="h-3 w-3" strokeWidth={1.5} />
          </button>
        )}
        <span className="shrink-0 text-[11px] text-muted-foreground/50">
          {timeAgo(comment.createdAt)}
        </span>
      </div>
    </div>
  );
}

// ─── Inline comment input ─────────────────────────────────────────────────

function CommentInput({
  onSubmit,
}: {
  onSubmit: (content: string) => void;
}) {
  const [value, setValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim()) {
      onSubmit(value.trim());
      setValue('');
    }
  };

  return (
    <div className="flex items-center gap-2.5 pt-1">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Adicione um comentário…"
        className={cn(
          'flex-1 bg-transparent text-xs text-foreground',
          'placeholder:text-muted-foreground/40',
          'border-0 outline-none ring-0',
        )}
      />
      {value.trim() && (
        <button
          onClick={() => { onSubmit(value.trim()); setValue(''); }}
          className="text-primary text-xs font-semibold transition-opacity hover:opacity-70"
        >
          <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}

// ─── PostCard ─────────────────────────────────────────────────────────────

interface PostCardProps {
  post: FeedPost;
  onLike: (postId: string) => void;
  onComment: (postId: string, content: string) => void;
  onDelete?: (postId: string) => void;
  onDeleteComment?: (postId: string, commentId: string) => void;
  onHide?: (postId: string) => void;
  onReport?: (postId: string) => void;
  onViewAllComments?: (postId: string) => void;
  currentUser?: any;
}

export function PostCard({ post, onLike, onComment, onDelete, onDeleteComment, onHide, onReport, onViewAllComments, currentUser }: PostCardProps) {
  const [showCommentInput, setShowCommentInput] = useState(false);

  const commentsToShow = post.recentComments.slice(0, 3);

  return (
    <article className="group animate-in-up border-b border-border/60 pb-8 last:border-0">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <MicroAvatar author={post.author} size={28} />
          <div className="flex items-center gap-1 text-sm leading-none">
            <span className="font-semibold text-foreground">
              {post.author.name.split(' ')[0]}
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-muted-foreground text-xs font-normal">
              {post.space.name}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground/50">
          <span className="text-[11px]">{timeAgo(post.createdAt)}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:text-foreground"
                aria-label="Mais opções"
              >
                <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onHide && (
                <DropdownMenuItem className="cursor-pointer" onClick={() => onHide(post.id)}>
                  <EyeOff className="mr-2 h-4 w-4" />
                  <span>Ocultar publicação</span>
                </DropdownMenuItem>
              )}
              {onReport && (
                <DropdownMenuItem className="cursor-pointer" onClick={() => onReport(post.id)}>
                  <Flag className="mr-2 h-4 w-4" />
                  <span>Denunciar publicação</span>
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={() => onDelete(post.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Excluir publicação</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Image — full width, slight rounding ────────────── */}
      <div className="overflow-hidden rounded-md bg-muted">
        <img
          src={getAbsoluteImageUrl(post.imageUrl)}
          alt={`Post de ${post.author.name} em ${post.space.name}`}
          className="w-full object-cover aspect-[4/3] transition-transform duration-500 group-hover:scale-[1.01]"
          loading="lazy"
          draggable={false}
        />
      </div>

      {/* ── Caption ────────────────────────────────────────── */}
      {post.content && (
        <p className="mt-3 text-sm leading-relaxed text-foreground/80">
          <span className="font-semibold text-foreground mr-1.5">
            {post.author.name.split(' ')[0]}
          </span>
          {post.content}
        </p>
      )}

      {/* ── Actions ────────────────────────────────────────── */}
      <div className="mt-3 flex items-center gap-4">
        <LikeButton
          liked={post.likedByMe}
          count={post.likesCount}
          onToggle={() => onLike(post.id)}
        />
        <button
          onClick={() => setShowCommentInput((v) => !v)}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors duration-150"
          aria-label="Comentar"
        >
          <MessageCircle className="h-5 w-5" strokeWidth={1.5} />
          {post.totalComments > 0 && (
            <span className="text-xs tabular-nums">{post.totalComments}</span>
          )}
        </button>
      </div>

      {/* ── Comments ────────────────────────────────────────── */}
      {(commentsToShow.length > 0 || showCommentInput) && (
        <div className="mt-3 space-y-2.5">
          {/* "Ver todos os comentários" link */}
          {post.totalComments > commentsToShow.length && onViewAllComments && (
            <button
              onClick={() => onViewAllComments(post.id)}
              className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors duration-150"
            >
              Ver todos os {post.totalComments} comentários
            </button>
          )}

          {commentsToShow.map((comment) => (
            <CommentRow 
              key={comment.id} 
              comment={comment} 
              canDelete={currentUser?.role === 'ADMIN' || currentUser?.id === comment.author.id}
              onDelete={onDeleteComment ? () => onDeleteComment(post.id, comment.id) : undefined}
            />
          ))}

          {/* Inline comment input */}
          {showCommentInput && (
            <CommentInput
              onSubmit={(content) => {
                onComment(post.id, content);
                setShowCommentInput(false);
              }}
            />
          )}
        </div>
      )}
    </article>
  );
}
