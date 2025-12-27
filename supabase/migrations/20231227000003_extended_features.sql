
-- EXTENDED FEATURES: LISTS, SETTINGS, MODERATION
-- Migration: 20231227000003_extended_features.sql

-- 1. LISTS MODULE
create table public.lists (
    id uuid default gen_random_uuid() primary key,
    owner_id uuid references public.profiles(id) on delete cascade not null,
    name text not null,
    description text,
    is_private boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- RLS: Lists
alter table public.lists enable row level security;

create policy "Public lists viewable by everyone"
    on public.lists for select
    using (is_private = false);

create policy "Users can see own lists"
    on public.lists for all
    using (auth.uid() = owner_id);

-- 2. LIST MEMBERS (Users in a list)
create table public.list_members (
    list_id uuid references public.lists(id) on delete cascade not null,
    user_id uuid references public.profiles(id) on delete cascade not null, -- The user being listed
    added_at timestamptz default now(),
    
    primary key (list_id, user_id)
);

-- RLS: List Members
alter table public.list_members enable row level security;

create policy "List members viewable via list access"
    on public.list_members for select
    using (
        exists (
            select 1 from public.lists
            where id = list_members.list_id
            and (is_private = false or owner_id = auth.uid())
        )
    );

create policy "Lister (owner) can manage members"
    on public.list_members for all
    using (
        exists (
            select 1 from public.lists
            where id = list_members.list_id
            and owner_id = auth.uid()
        )
    );

-- 3. USER SETTINGS
-- Stores preferences like theme, privacy, notifications.
-- Separate from profiles to keep 'profiles' lightweight and public.
create table public.user_settings (
    user_id uuid references public.profiles(id) on delete cascade primary key,
    privacy jsonb default '{ "protect_posts": false, "read_receipts": true }'::jsonb,
    notifications jsonb default '{ "email_digest": true, "push_mentions": true }'::jsonb,
    theme jsonb default '{ "mode": "system", "color": "blue" }'::jsonb,
    updated_at timestamptz default now()
);

-- RLS: User Settings
alter table public.user_settings enable row level security;

create policy "Users can only see/manage own settings"
    on public.user_settings for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- 4. REPORTS (Moderation)
create table public.reports (
    id uuid default gen_random_uuid() primary key,
    reporter_id uuid references public.profiles(id) on delete set null,
    target_id uuid not null, -- Polymorphic reference
    target_type text check (target_type in ('POST', 'USER', 'LIST', 'COMMENT')) not null,
    reason text not null,
    status text check (status in ('OPEN', 'RESOLVED', 'DISMISSED')) default 'OPEN',
    created_at timestamptz default now(),
    resolved_at timestamptz
);

-- RLS: Reports
alter table public.reports enable row level security;

create policy "Users can submit reports"
    on public.reports for insert
    with check (auth.uid() = reporter_id);

create policy "Users can see own reports"
    on public.reports for select
    using (auth.uid() = reporter_id);

-- Admins would view reports via Service Role or separate Admin Policy (omitted for standard user schema)

-- 5. TRIGGER: Auto-Create Settings
-- Extend the profile creation trigger to also init settings
create or replace function public.handle_new_user_settings()
returns trigger as $$
begin
  insert into public.user_settings (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created_settings
  after insert on public.profiles
  for each row execute procedure public.handle_new_user_settings();
