
export type Author = {
    id: string;
    name: string;
    username: string;
    avatar: string;
  };
  
  export type Comment = {
    id: string;
    author: Author;
    content: string;
    createdAt: string;
    userReaction: 'LIKE' | 'DISLIKE' | 'LAUGH' | 'NONE';
    likeCount: number;
    dislikeCount: number;
    laughCount: number;
    repostCount: number;
    commentCount: number;
  };
  
  export type Post = {
    id: string;
    content: string;
    author: Author;
    createdAt: string;
    likeCount: number;
    dislikeCount: number;
    laughCount: number;
    repostCount: number;
    commentCount: number;
    userReaction: 'LIKE' | 'DISLIKE' | 'LAUGH' | 'NONE';
    comments?: Comment[];
  };