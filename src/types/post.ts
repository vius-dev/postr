
import { Poll } from "@/types/poll";
import { User } from "@/types/user";

export type ReactionAction = 'LIKE' | 'DISLIKE' | 'LAUGH' | 'NONE';

export type Author = Pick<User, 'id' | 'name' | 'username' | 'avatar'>;

export type Media = {
  type: 'image' | 'video';
  url: string;
};

export type Comment = {
  userReaction: ReactionAction;
  likeCount: number;
  dislikeCount: number;
  laughCount: number;
  repostCount: number;
  commentCount: number;
  id: string;
  author: Author;
  content: string;
  createdAt: string;
  comments?: Comment[]; // Unified field name
  media?: Media[];
  parentPostId?: string;
};

export type Post = {
  id: string;
  author: Author;
  content: string;
  createdAt: string;
  likeCount: number;
  dislikeCount: number;
  laughCount: number;
  repostCount: number;
  commentCount: number;
  userReaction: ReactionAction;
  repostedBy?: Author;
  isReposted?: boolean;
  quotedPost?: Post;
  poll?: Poll;
  comments?: Comment[];
  media?: Media[];
  parentPostId?: string;
};

export type ReportReason = 'SPAM' | 'HARASSMENT' | 'HATE_SPEECH' | 'MISINFORMATION' | 'OTHER';
