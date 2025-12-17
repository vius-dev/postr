
import { Post } from '@/types/post';

const TTL = 5 * 60 * 1000; // 5 minutes

export class CacheLayer {
  private cache = new Map<string, { posts: Post[]; timestamp: number }>();

  get(key: string): Post[] | undefined {
    const cached = this.cache.get(key);
    if (!cached) {
      return undefined;
    }

    if (Date.now() - cached.timestamp > TTL) {
      this.cache.delete(key);
      return undefined;
    }

    return cached.posts;
  }

  set(key: string, posts: Post[]) {
    this.cache.set(key, { posts, timestamp: Date.now() });
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string) {
    this.cache.delete(key);
  }
}
