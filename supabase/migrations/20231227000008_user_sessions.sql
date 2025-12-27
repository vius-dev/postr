
-- USER SESSIONS TRACKING
-- Migration: 20231227000008_user_sessions.sql

create table public.user_sessions (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    device text not null,
    location text,
    ip_address text,
    is_current boolean default false,
    last_active timestamptz default now(),
    created_at timestamptz default now()
);

-- RLS: User Sessions
alter table public.user_sessions enable row level security;

create policy "Users can manage their own sessions"
    on public.user_sessions for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Optional: Trigger to manage is_current? 
-- Realistically, is_current is handled by the client/API layer by matching the current token.
-- But we can store it for display.
