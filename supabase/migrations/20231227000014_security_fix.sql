
-- Migration: 20231227000014_security_fix.sql
-- Goal: Harden unread_conversations view to respect RLS (preventing SECURITY DEFINER bypass)

-- 1. Drop the old view if it exists (it was created in migration 13)
drop view if exists public.unread_conversations;

-- 2. Re-create with security_invoker = true
create view public.unread_conversations 
with (security_invoker = true)
as
select 
    cp.user_id,
    cp.conversation_id,
    count(m.id) as unread_count
from public.conversation_participants cp
join public.messages m on m.conversation_id = cp.conversation_id
where m.created_at > cp.last_read_at
and m.sender_id != cp.user_id
group by cp.user_id, cp.conversation_id;

-- This ensures that querying the view is equivalent to querying the base tables under the current user's RLS.
