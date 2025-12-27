
-- MESSAGING MODULE
-- Migration: 20231227000001_messaging.sql


-- 1. CONVERSATIONS
create table public.conversations (
    id uuid default gen_random_uuid() primary key,
    type text check (type in ('PRIVATE', 'GROUP')) default 'PRIVATE',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 2. PARTICIPANTS
create table public.conversation_participants (
    conversation_id uuid references public.conversations(id) on delete cascade,
    user_id uuid references public.profiles(id) on delete cascade,
    is_admin boolean default false,
    last_read_at timestamptz default now(),
    created_at timestamptz default now(),
    
    primary key (conversation_id, user_id)
);

-- 3. MESSAGES
create table public.messages (
    id uuid default gen_random_uuid() primary key,
    conversation_id uuid references public.conversations(id) on delete cascade not null,
    sender_id uuid references public.profiles(id) on delete cascade not null,
    content text,
    media_url text, -- Optional media attachment
    type text check (type in ('TEXT', 'IMAGE', 'SYSTEM')) default 'TEXT',
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    deleted_at timestamptz -- Soft delete
);

-- RLS: Enable
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

-- RLS: Policies

-- Conversations
create policy "Conversations viewable by participants"
    on public.conversations for select
    using (
        exists (
            select 1 from public.conversation_participants
            where conversation_id = conversations.id
            and user_id = auth.uid()
        )
    );

-- Participants
create policy "Users can see their own participations"
    on public.conversation_participants for select
    using (user_id = auth.uid());

create policy "Users can see other participants in their chats"
    on public.conversation_participants for select
    using (
        exists (
            select 1 from public.conversation_participants participant
            where participant.conversation_id = conversation_participants.conversation_id
            and participant.user_id = auth.uid()
        )
    );

-- Messages
create policy "Messages viewable by conversation participants"
    on public.messages for select
    using (
        exists (
            select 1 from public.conversation_participants
            where conversation_id = messages.conversation_id
            and user_id = auth.uid()
        )
    );

create policy "Users can insert messages into their conversations"
    on public.messages for insert
    with check (
        auth.uid() = sender_id and
        exists (
            select 1 from public.conversation_participants
            where conversation_id = messages.conversation_id
            and user_id = auth.uid()
        )
    );

create policy "Seners can soft delete their messages"
    on public.messages for update
    using (auth.uid() = sender_id)
    with check (deleted_at is not null); -- Only allow soft delete update

-- 4. REALTIME TRIGGER (Optional Optimization)
-- Trigger to update conversation.updated_at on new message
create or replace function public.handle_new_message()
returns trigger as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_message_created
  after insert on public.messages
  for each row execute procedure public.handle_new_message();
