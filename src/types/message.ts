import { User } from "./user";

export interface Message {
    id: string;
    senderId: string;
    text: string;
    createdAt: string;
    type?: 'CHAT' | 'SYSTEM';
    reactions?: Record<string, number>;
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
    isPinned?: boolean;
    pinnedMessageId?: string;
}
