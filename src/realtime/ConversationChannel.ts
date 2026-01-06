import { supabase } from '@/lib/supabase';
import { eventEmitter } from '@/lib/EventEmitter';
import { api } from '@/lib/api';

export class ConversationChannel {
  private channel: any = null;

  public initialize() {
    this.channel = supabase
      .channel('messages-all')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const newMessage = payload.new;
          try {
            // Hydrate message with sender info (optional but recommended for consistency)
            const senderRes = await supabase
              .from('profiles')
              .select('*')
              .eq('id', newMessage.sender_id)
              .single();

            const hydratedMessage = {
              id: newMessage.id,
              conversationId: newMessage.conversation_id,
              senderId: newMessage.sender_id,
              text: newMessage.content,
              createdAt: newMessage.created_at,
              sender: senderRes.data,
              media: newMessage.media_url ? [{ url: newMessage.media_url, type: newMessage.type === 'IMAGE' ? 'image' : 'video' }] : [],
            };

            eventEmitter.emit('newMessage', {
              conversationId: newMessage.conversation_id,
              message: hydratedMessage
            });
          } catch (error) {
            console.error('[Realtime] Failed to process new message', error);
          }
        }
      )
      .subscribe();
  }

  public shutdown() {
    if (this.channel) {
      this.channel.unsubscribe();
    }
  }
}
