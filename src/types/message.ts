import { User } from "./user";

export interface Message {
    id: string;
    senderId: string;
    text: string;
    createdAt: string;
    type?: 'CHAT' | 'SYSTEM';
    reactions?: Record<string, number>;
    conversationId?: string;
    isRead?: boolean;
    media?: any[];
    sender?: User;
}

export type ConversationType = 'DM' | 'GROUP' | 'CHANNEL';

export interface Conversation {
    id: string;
    type: ConversationType;
    participants: User[];
    lastMessage?: Message;
    unreadCount: number;
    name?: string;
    description?: string;
    ownerId?: string;
    adminIds?: string[];
    isPinned?: boolean;
    pinnedMessageId?: string;
    isLowQuality?: boolean;
    isMuted?: boolean;
}

