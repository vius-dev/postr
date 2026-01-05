import { User } from './user';

export interface List {
    id: string;
    owner: User;
    name: string;
    description?: string;
    isPrivate: boolean;
    createdAt: string;
    updatedAt: string;

    // Computed fields
    memberCount?: number;
    subscriberCount?: number;
    isSubscribed?: boolean;
}

export interface ListMember {
    id: string;
    listId: string;
    user: User;
    addedAt: string;
    addedBy: User;
}

export interface ListSubscription {
    id: string;
    listId: string;
    subscriber: User;
    subscribedAt: string;
}

export interface CreateListInput {
    name: string;
    description?: string;
    isPrivate?: boolean;
}

export interface UpdateListInput {
    name?: string;
    description?: string;
    isPrivate?: boolean;
}
