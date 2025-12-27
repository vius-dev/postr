
-- SOCIAL GRAPH & UTILITIES
-- Migration: 20231227000002_social_graph.sql

-- 1. NOTIFICATIONS
-- Rule: Recipient ownership
create table public.notifications (
    id uuid default gen_random_uuid() primary key,
    recipient_id uuid references public.profiles(id) on delete cascade not null,
    actor_id uuid references public.profiles(id) on delete cascade, -- Optional (e.g. system notification)
    type text check (type in ('FOLLOW', 'MENTION', 'REPLY', 'LIKE', 'REPOST', 'POLL_ENDED', 'SYSTEM')) not null,
    data jsonb default '{}'::jsonb, -- Stores context like post_id, comment_id
    is_read boolean default false,
    created_at timestamptz default now()
);

-- RLS: Notifications
alter table public.notifications enable row level security;

create policy "Users can see their own notifications"
    on public.notifications for select
    using (auth.uid() = recipient_id);

create policy "Users can update their notifications (mark read)"
    on public.notifications for update
    using (auth.uid() = recipient_id);

-- System/Triggers handle insertion, but for now allow strict inserts if needed for client-side testing (usually blocked)
-- For strict security: No INSERT policy for public role.

-- 2. BOOKMARKS
-- Rule: Private to owner
create table public.bookmarks (
    user_id uuid references public.profiles(id) on delete cascade not null,
    post_id uuid references public.posts(id) on delete cascade not null,
    created_at timestamptz default now(),
    
    primary key (user_id, post_id)
);

-- RLS: Bookmarks
alter table public.bookmarks enable row level security;

create policy "Users can see and manage own bookmarks"
    on public.bookmarks for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- 3. MUTES (Negative Access)
-- Combined with blocks logic from initial schema if needed, or separate
create table public.mutes (
    muter_id uuid references public.profiles(id) on delete cascade not null,
    muted_id uuid references public.profiles(id) on delete cascade not null,
    created_at timestamptz default now(),
    
    primary key (muter_id, muted_id)
);

-- RLS: Mutes
alter table public.mutes enable row level security;

create policy "Users can see and manage own mutes"
    on public.mutes for all
    using (auth.uid() = muter_id)
    with check (auth.uid() = muter_id);

-- 4. HASHTAGS (Optional Metadata)
create table public.hashtags (
    tag text primary key,
    usage_count int default 1,
    last_used_at timestamptz default now()
);

-- RLS: Hashtags
alter table public.hashtags enable row level security;

create policy "Hashtags are public"
    on public.hashtags for select
    using (true);

-- 5. POLLS (Extension to Posts)
create table public.polls (
    post_id uuid references public.posts(id) on delete cascade primary key,
    question text not null,
    closes_at timestamptz not null,
    created_at timestamptz default now()
);

create table public.poll_options (
    id uuid default gen_random_uuid() primary key,
    poll_id uuid references public.polls(post_id) on delete cascade not null,
    label text not null,
    vote_count int default 0,
    order_index int default 0
);

create table public.poll_votes (
    poll_id uuid references public.polls(post_id) on delete cascade not null,
    option_id uuid references public.poll_options(id) on delete cascade not null,
    user_id uuid references public.profiles(id) on delete cascade not null,
    created_at timestamptz default now(),
    
    primary key (poll_id, user_id) -- One vote per poll per user
);

-- RLS: Polls (Public Read)
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;

create policy "Polls viewable by everyone" on public.polls for select using (true);
create policy "Options viewable by everyone" on public.poll_options for select using (true);

create policy "Users can vote once"
    on public.poll_votes for insert
    with check (auth.uid() = user_id);

create policy "Users can see their own votes (or public if desired)"
    on public.poll_votes for select
    using (true); -- Votes are usually public anonymous stats, but row data might be private? Keeping public for now or restrict to owner if anon.

-- Trigger to increment vote count
create or replace function public.increment_vote_count()
returns trigger as $$
begin
  update public.poll_options
  set vote_count = vote_count + 1
  where id = new.option_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_poll_vote
  after insert on public.poll_votes
  for each row execute procedure public.increment_vote_count();
