import { supabase } from '@/lib/supabase';
import { eventEmitter } from '@/lib/EventEmitter';

export class PresenceChannel {
  private channel: any = null;

  public initialize() {
    this.channel = supabase.channel('presence-typing', {
      config: {
        presence: {
          key: 'typing',
        },
      },
    });

    this.channel
      .on('presence', { event: 'sync' }, () => {
        const state = this.channel.presenceState();
        // Flatten presence state for the UI
        const typingUsers: Record<string, string[]> = {}; // convoId -> userIds

        Object.values(state).flat().forEach((p: any) => {
          if (p.conversationId && p.userId) {
            if (!typingUsers[p.conversationId]) {
              typingUsers[p.conversationId] = [];
            }
            typingUsers[p.conversationId].push(p.userId);
          }
        });

        eventEmitter.emit('typingUpdate', typingUsers);
      })
      .subscribe();
  }

  public shutdown() {
    if (this.channel) {
      this.channel.unsubscribe();
    }
  }

  public static async sendTypingStatus(conversationId: string, userId: string, isTyping: boolean) {
    const channel = supabase.channel('presence-typing');
    if (isTyping) {
      await channel.track({ conversationId, userId, timestamp: Date.now() });
    } else {
      await channel.untrack();
    }
  }
}
