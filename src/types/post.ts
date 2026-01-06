
import { Poll } from "@/types/poll";
import { User } from "@/types/user";

export type ReactionAction = 'LIKE' | 'DISLIKE' | 'LAUGH' | 'REPOST' | 'NONE';

export type Author = Pick<User, 'id' | 'name' | 'username' | 'avatar' | 'is_suspended' | 'is_shadow_banned' | 'is_limited' | 'is_verified' | 'verification_type' | 'official_logo' | 'authority_end'>;

export type Media = {
  type: 'image' | 'video';
  url: string;
};

export type Comment = {
  id: string;
  author: Author;
  content: string;
  createdAt: string;
  updatedAt?: string;

  viewer: {
    isSelf: boolean;
    reaction: ReactionAction;
    isBookmarked: boolean;
    isReposted: boolean;
  };

  stats: {
    likes: number;
    dislikes: number;
    laughs: number;
    reposts: number;
    replies: number;
  };

  meta: {
    isEdited: boolean;
    editedLabel: string | null;
  };

  media?: Media[];
  comments?: Comment[];
  parentPostId?: string;
  repostedPostId?: string;
  replyToUsername?: string;
};

export type Post = {
  id: string;
  content: string;
  type: 'original' | 'repost' | 'quote' | 'reply' | 'poll';
  createdAt: string;
  updatedAt?: string;
  content_edited_at?: string;

  author: Author;

  viewer: {
    isSelf: boolean;
    reaction: ReactionAction;
    hasLiked: boolean;
    hasDisliked: boolean;
    hasLaughed: boolean;
    isBookmarked: boolean;
    isReposted: boolean;
    userVoteIndex?: number | null;
  };

  stats: {
    likes: number;
    dislikes: number;
    laughs: number;
    reposts: number;
    replies: number;
  };

  meta: {
    isEdited: boolean;
    editedLabel: string | null;
    visibility: 'public' | 'followers' | 'private';
  };

  media?: Media[];
  poll?: Poll;

  quotedPost?: Post;
  repostedPost?: Post;

  parentPostId?: string;
  quotedPostId?: string;
  repostedPostId?: string;
  replyToUsername?: string;

  // Legacy/UI specific (to be cleaned up if needed)
  repostedBy?: Author;
};

export type ReportReason = 'SPAM' | 'HARASSMENT' | 'HATE_SPEECH' | 'MISINFORMATION' | 'OTHER';

export type FeedPost = Post;
