
import { supabase } from '@/lib/supabase';
import { eventEmitter } from '@/lib/EventEmitter';

export class FeedAnnotations {
  public initialize() {
    supabase
      .channel('feed-annotations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'likes' },
        async (payload) => {
          const { new: newRecord, old: oldRecord, eventType } = payload;
          const record = eventType === 'DELETE' ? oldRecord : newRecord;
          const postId = record?.post_id;

          if (!postId) return;

          const { count, error } = await supabase
            .from('likes')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', postId);

          if (error) {
            console.error('Error getting like count:', error);
            return;
          }

          eventEmitter.emit('like-count-update', { postId, count: count ?? 0 });
        }
      )
      .subscribe();
  }

  public shutdown() {
    supabase.channel('feed-annotations').unsubscribe();
  }
}
