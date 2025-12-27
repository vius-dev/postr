-- MESSAGING ENHANCEMENTS
-- Migration: 20231227000009_messaging_enhancements.sql

-- 1. ADD PINNED MESSAGE TO CONVERSATIONS
alter table public.conversations 
add column pinned_message_id uuid references public.messages(id) on delete set null;

-- 2. MESSAGE REACTIONS
create table public.message_reactions (
    id uuid default gen_random_uuid() primary key,
    message_id uuid references public.messages(id) on delete cascade not null,
    user_id uuid references public.profiles(id) on delete cascade not null,
    emoji text not null,
    created_at timestamptz default now(),

    unique(message_id, user_id, emoji)
);

-- RLS: Message Reactions
alter table public.message_reactions enable row level security;

create policy "Message reactions viewable by conversation participants"
    on public.message_reactions for select
    using (
        exists (
            select 1 from public.messages
            join public.conversation_participants on messages.conversation_id = conversation_participants.conversation_id
            where messages.id = message_reactions.message_id
            and conversation_participants.user_id = auth.uid()
        )
    );

create policy "Users can react to messages in their conversations"
    on public.message_reactions for insert
    with check (
        auth.uid() = user_id and
        exists (
            select 1 from public.messages
            join public.conversation_participants on messages.conversation_id = conversation_participants.conversation_id
            where messages.id = message_reactions.message_id
            and conversation_participants.user_id = auth.uid()
        )
    );

create policy "Users can remove their own message reactions"
    on public.message_reactions for delete
    using (auth.uid() = user_id);

-- 3. INDEXES for performance
create index idx_message_reactions_message_id on public.message_reactions(message_id);
create index idx_conversations_pinned_message_id on public.conversations(pinned_message_id);
