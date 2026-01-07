
-- ANALYTICS, HISTORY, AND ADMIN
-- Migration: 20231227000004_analytics_and_admin.sql

-- 1. POST VIEWS (Analytics)
-- High volume, append-only
create table public.post_views (
    id uuid default gen_random_uuid() primary key,
    post_id uuid references public.posts(id) on delete cascade not null,
    user_id uuid references public.profiles(id) on delete set null, -- Optional (for logged out views)
    ip_hash text, -- For anon tracking
    viewed_at timestamptz default now()
);

-- RLS: Views
alter table public.post_views enable row level security;

create policy "Users can record views"
    on public.post_views for insert
    with check (
        auth.uid() is not null 
        and (user_id = auth.uid() or user_id is null)
    );

-- No public read (Analytics are private)

-- 2. USERNAME HISTORY (Audit Log)
create table public.username_history (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    old_username text not null,
    new_username text not null,
    changed_at timestamptz default now()
);

-- RLS: History
alter table public.username_history enable row level security;

create policy "Users can see own history"
    on public.username_history for select
    using (auth.uid() = user_id);

-- 3. RESERVED USERNAMES (System Config)
create table public.reserved_usernames (
    username text primary key,
    category text, -- 'system', 'role', 'party'
    reason text,
    created_at timestamptz default now()
);

-- RLS: Reserved
alter table public.reserved_usernames enable row level security;

create policy "Reserved names are public"
    on public.reserved_usernames for select
    using (true);

-- 4. USER ROLES (RBAC)
create table public.user_roles (
    user_id uuid references public.profiles(id) on delete cascade not null,
    role text check (role in ('admin', 'moderator', 'staff', 'tester')) not null,
    assigned_at timestamptz default now(),
    
    primary key (user_id, role)
);

-- RLS: Roles
alter table public.user_roles enable row level security;

create policy "Roles are public (for badge display)"
    on public.user_roles for select
    using (true);

-- Writes restricted to super-admin or database owner

-- 5. FUNCTION: Check Reserved Username
create or replace function public.is_reserved_username(check_username text)
returns boolean as $$
declare
  is_reserved boolean;
begin
  select exists(
    select 1 from public.reserved_usernames 
    where lower(username) = lower(check_username)
  ) into is_reserved;
  
  return is_reserved;
end;
$$ language plpgsql security definer set search_path = public;
