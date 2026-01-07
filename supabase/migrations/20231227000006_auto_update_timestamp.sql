
-- AUTOMATIC TIMESTAMP UPDATES
-- Migration: 20231227000006_auto_update_timestamp.sql

-- 1. GENERIC TIMESTAMP FUNCTION
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- 2. APPLY TRIGGERS TO CORE TABLES

-- Posts (Critical for "Edited" label)
create trigger on_posts_update
  before update on public.posts
  for each row execute procedure public.handle_updated_at();

-- Profiles
create trigger on_profiles_update
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- Conversations
create trigger on_conversations_update
  before update on public.conversations
  for each row execute procedure public.handle_updated_at();

-- User Settings
create trigger on_user_settings_update
  before update on public.user_settings
  for each row execute procedure public.handle_updated_at();

-- Messages allows soft-delete updates, so we track that too
create trigger on_messages_update
  before update on public.messages
  for each row execute procedure public.handle_updated_at();
