
import { Post } from '@/types/post';

export class MergeEngine {
  merge(timelines: Post[][]): Post[] {
    const allPosts = timelines.flat();
    allPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return allPosts;
  }
}
