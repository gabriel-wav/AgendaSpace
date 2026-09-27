// Shared types for the Feed feature

export interface FeedAuthor {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface FeedComment {
  id: string;
  author: FeedAuthor;
  content: string;
  createdAt: string;
}

export interface FeedPost {
  id: string;
  author: FeedAuthor;
  space: {
    id: string;
    name: string;
  };
  imageUrl: string;
  content: string;
  likesCount: number;
  likedByMe: boolean;
  recentComments: FeedComment[];
  totalComments: number;
  createdAt: string;
}
