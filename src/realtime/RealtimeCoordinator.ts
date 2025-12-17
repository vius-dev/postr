
import { FeedAnnotations } from '@/realtime/FeedAnnotations';
import { ConversationChannel } from '@/realtime/ConversationChannel';
import { ReactionChannel } from '@/realtime/ReactionChannel';
import { PresenceChannel } from '@/realtime/PresenceChannel';
import { PushDispatcher } from '@/realtime/PushDispatcher';
import { ReconciliationManager } from '@/realtime/ReconciliationManager';

class RealtimeCoordinator {
  private feedAnnotations: FeedAnnotations;
  private conversationChannel: ConversationChannel;
  private reactionChannel: ReactionChannel;
  private presenceChannel: PresenceChannel;
  private pushDispatcher: PushDispatcher;
  private reconciliationManager: ReconciliationManager;

  constructor() {
    this.feedAnnotations = new FeedAnnotations();
    this.conversationChannel = new ConversationChannel();
    this.reactionChannel = new ReactionChannel();
    this.presenceChannel = new PresenceChannel();
    this.pushDispatcher = new PushDispatcher();
    this.reconciliationManager = new ReconciliationManager();
  }

  public initialize() {
    this.feedAnnotations.initialize();
    this.conversationChannel.initialize();
    this.reactionChannel.initialize();
    this.presenceChannel.initialize();
    this.pushDispatcher.initialize();
    this.reconciliationManager.initialize();
  }

  public shutdown() {
    this.feedAnnotations.shutdown();
    this.conversationChannel.shutdown();
    this.reactionChannel.shutdown();
    this.presenceChannel.shutdown();
    this.pushDispatcher.shutdown();
    this.reconciliationManager.shutdown();
  }
}

export const realtimeCoordinator = new RealtimeCoordinator();
