
-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. SCHEMAS
create schema if not exists private;

-- 3. CORE IDENTITY (profiles)
-- Matches api.ts: User
create table public.profiles (
    id uuid references auth.users on delete cascade primary key, -- owner_id is implicit
    username text unique not null,
    name text not null,
    avatar text,
    header_image text,
    bio text,
    location text,
    website text,
    is_active boolean default true,
    is_suspended boolean default false,
    is_limited boolean default false,
    is_shadow_banned boolean default false,
    is_verified boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    
    constraint username_length check (char_length(username) >= 3)
);

-- RLS: Profiles (Ownership-First)
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
    on public.profiles for select
    using (true);

create policy "Users can insert their own profile"
    on public.profiles for insert
    with check (auth.uid() = id);

create policy "Users can update own profile"
    on public.profiles for update
    using (auth.uid() = id);

-- 4. CONTENT CORE (posts)
-- Matches api.ts: Post (minus stats/media)
-- Rule: Posts do not know about reactions or comments.
create type public.post_visibility as enum ('public', 'followers', 'private');

create table public.posts (
    id uuid default gen_random_uuid() primary key,
    owner_id uuid references public.profiles(id) on delete cascade not null,
    content text,
    type text check (type in ('original', 'repost', 'quote')) default 'original',
    parent_id uuid references public.posts(id), -- For threading (replies)
    quoted_post_id uuid references public.posts(id), -- For quotes
    visibility public.post_visibility default 'public',
    is_pinned boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    deleted_at timestamptz -- Soft delete
);

-- RLS: Posts (Ownership-First + Soft Delete)
alter table public.posts enable row level security;

create policy "Posts are viewable by everyone unless deleted or private"
    on public.posts for select
    using (
        type = 'original' and
        (deleted_at is null) and
        (
            visibility = 'public' 
            or owner_id = auth.uid()
            -- Follower visibility logic would go here with EXISTS
        )
    );

create policy "Users can create posts"
    on public.posts for insert
    with check (auth.uid() = owner_id);

create policy "Users can update own posts"
    on public.posts for update
    using (auth.uid() = owner_id);

create policy "Users can soft delete own posts"
    on public.posts for update
    using (auth.uid() = owner_id)
    with check (deleted_at is not null);

-- 5. CONTENT MEDIA (post_media)
-- Separated from posts table
create table public.post_media (
    id uuid default gen_random_uuid() primary key,
    post_id uuid references public.posts(id) on delete cascade not null,
    url text not null,
    type text check (type in ('image', 'video')) not null,
    aspect_ratio float,
    order_index int default 0,
    created_at timestamptz default now()
);

alter table public.post_media enable row level security;

create policy "Media viewable via post access"
    on public.post_media for select
    using (exists (select 1 from public.posts where id = post_media.post_id)); -- Delegate to posts RLS

create policy "Users can add media to own posts"
    on public.post_media for insert
    with check (exists (select 1 from public.posts where id = post_media.post_id and owner_id = auth.uid()));

-- 6. INTERACTION MODULE: REACTIONS (post_reactions)
-- Matches api.ts: reactionsMap
-- Rule: Actor-Subject Pattern
create table public.post_reactions (
    id uuid default gen_random_uuid() primary key,
    actor_id uuid references public.profiles(id) on delete cascade not null, -- Who
    subject_id uuid references public.posts(id) on delete cascade not null, -- What
    type text check (type in ('LIKE', 'DISLIKE', 'LAUGH')) not null,
    created_at timestamptz default now(),
    
    unique(actor_id, subject_id) -- One reaction per user per post
);

alter table public.post_reactions enable row level security;

create policy "Reactions are viewable by everyone"
    on public.post_reactions for select
    using (true);

create policy "Users can react as themselves"
    on public.post_reactions for insert
    with check (auth.uid() = actor_id);

create policy "Users can remove their own reactions"
    on public.post_reactions for delete
    using (auth.uid() = actor_id);

-- 7. READ-HEAVY AGGREGATES (reaction_aggregates)
-- Read Public, Write Private Pattern
create table public.reaction_aggregates (
    subject_id uuid references public.posts(id) on delete cascade primary key,
    like_count int default 0,
    dislike_count int default 0,
    laugh_count int default 0,
    repost_count int default 0,
    comment_count int default 0,
    updated_at timestamptz default now()
);

alter table public.reaction_aggregates enable row level security;

create policy "Aggregates are public"
    on public.reaction_aggregates for select
    using (true);

-- No insert/update policy for clients -> Edge Functions/Triggers only.

-- 8. RELATIONSHIP MODULE (follows)
create table public.follows (
    follower_id uuid references public.profiles(id) on delete cascade not null,
    following_id uuid references public.profiles(id) on delete cascade not null,
    created_at timestamptz default now(),
    
    primary key (follower_id, following_id),
    check (follower_id != following_id)
);

alter table public.follows enable row level security;

create policy "Follows viewable by everyone"
    on public.follows for select
    using (true);

create policy "Users can follow others"
    on public.follows for insert
    with check (auth.uid() = follower_id);

create policy "Users can unfollow"
    on public.follows for delete
    using (auth.uid() = follower_id);

-- 9. NEGATIVE ACCESS (blocks)
-- Centralized block logic
create table public.blocks (
    blocker_id uuid references public.profiles(id) on delete cascade not null,
    blocked_id uuid references public.profiles(id) on delete cascade not null,
    created_at timestamptz default now(),
    
    primary key (blocker_id, blocked_id)
);

alter table public.blocks enable row level security;

create policy "Users can see their own blocks"
    on public.blocks for select
    using (auth.uid() = blocker_id);

create policy "Users can block others"
    on public.blocks for insert
    with check (auth.uid() = blocker_id);

create policy "Users can unblock"
    on public.blocks for delete
    using (auth.uid() = blocker_id);

-- 10. TRIGGER: Auto-Provision Profile
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, name, avatar)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'https://i.pravatar.cc/150?u=' || new.id
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 11. TRIGGER: Update Aggregates (Simple Example)
create or replace function public.update_reaction_counts()
returns trigger as $$
begin
  insert into public.reaction_aggregates (subject_id)
  values (coalesce(new.subject_id, old.subject_id))
  on conflict (subject_id) do nothing;

  if (TG_OP = 'INSERT') then
    if (new.type = 'LIKE') then
        update public.reaction_aggregates set like_count = like_count + 1 where subject_id = new.subject_id;
    elsif (new.type = 'DISLIKE') then
        update public.reaction_aggregates set dislike_count = dislike_count + 1 where subject_id = new.subject_id;
    end if;
  elsif (TG_OP = 'DELETE') then
     if (old.type = 'LIKE') then
        update public.reaction_aggregates set like_count = like_count - 1 where subject_id = old.subject_id;
    elsif (old.type = 'DISLIKE') then
        update public.reaction_aggregates set dislike_count = dislike_count - 1 where subject_id = old.subject_id;
    end if;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_reaction_change
  after insert or delete on public.post_reactions
  for each row execute procedure public.update_reaction_counts();
