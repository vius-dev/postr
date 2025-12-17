
import { PostgrestClient } from '@supabase/postgrest-js';
import { Post } from '@/types/post';

export class AuthorTimelineSource {
  constructor(private db: PostgrestClient) {}

  async getAuthorTimeline(authorId: string): Promise<Post[]> {
    const { data, error } = await this.db
      .from('posts')
      .select('*')
      .eq('author_id', authorId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching author timeline:', error);
      return [];
    }

    return data as Post[];
  }
}
