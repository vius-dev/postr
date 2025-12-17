
import { PostgrestClient } from '@supabase/postgrest-js';
import { FeedEngine } from '@/core/feed';
import type { Feed } from '@/types/feed';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const postgrest = new PostgrestClient(`${supabaseUrl}/rest/v1`, {
  headers: {
    apiKey: supabaseAnonKey,
  },
});

const feedEngine = new FeedEngine(postgrest);

export const fetchFeed = async (cursor?: string): Promise<Feed> => {
  console.log('Fetching feed with cursor:', cursor);
  // In a real app, you'd get the user ID from the session
  const userId = 'HARDCODED_USER_ID'; 
  const posts = await feedEngine.getFeed(userId);
  return {
    posts,
  };
};
