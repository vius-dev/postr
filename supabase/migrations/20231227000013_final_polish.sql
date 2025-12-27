
-- FINAL RELIABILITY & PERFORMANCE POLISH
-- Migration: 20231227000013_final_polish.sql

-- 1. FULL-TEXT SEARCH (POSTS)
-- Add a generated column for better search performance
alter table public.posts 
add column fts tsvector 
generated always as (to_tsvector('english', coalesce(content, ''))) stored;

create index posts_fts_idx on public.posts using gin(fts);

-- 2. MENTION EXTRACTION TRIGGER
-- Scans content for @username and creates notifications
create or replace function public.handle_mentions()
returns trigger as $$
declare
    mention_user_record record;
    mention_username text;
begin
    -- Simple regex to find words starting with @
    for mention_username in 
        select distinct (regexp_matches(new.content, '@([a-zA-Z0-9_]{3,20})', 'g'))[1]
    loop
        -- Find the user ID for the username
        select id into mention_user_record from public.profiles where username = mention_username;
        
        -- If user exists and is not the author, create notification
        if (mention_user_record.id is not null and mention_user_record.id != new.owner_id) then
            insert into public.notifications (recipient_id, actor_id, type, data)
            values (
                mention_user_record.id,
                new.owner_id,
                'mention',
                jsonb_build_object(
                    'post_id', new.id,
                    'post_snippet', substring(new.content from 1 for 100)
                )
            );
        end if;
    end loop;
    return new;
end;
$$ language plpgsql security definer;

create trigger on_post_mentions
    after insert on public.posts
    for each row
    when (new.content is not null)
    execute procedure public.handle_mentions();

-- 3. MESSAGING PERFORMANCE INDEX
-- Optimizes unread badge calculation and conversation sorting
create index idx_conversation_participants_unread 
on public.conversation_participants(user_id, last_read_at desc);

-- 4. STORAGE SECURITY (MESSAGE MEDIA)
-- Add RLS policy for reading message media only if participant
-- This is a high-security measure for private media
create policy "Participants can read message media"
  on storage.objects for select
  using (
    bucket_id = 'message_media' 
    and (
      exists (
        select 1 from public.messages m
        join public.conversation_participants cp on cp.conversation_id = m.conversation_id
        where m.media_url like '%' || name -- Match filename in URL
        and cp.user_id = auth.uid()
      )
    )
  );

-- 5. CASCADE DELETES REFINEMENT
-- Ensure messaging records are also cleaned up if a user is deleted
-- (Already covered by references in messaging.sql, but good to be explicit here)
-- alter table public.messages add constraint messages_sender_id_fkey foreign key (sender_id) references public.profiles(id) on delete cascade;
-- alter table public.conversation_participants add constraint cp_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;

-- 6. UNREAD STATUS VIEW (Optional helper)
create or replace view public.unread_conversations as
select 
    cp.user_id,
    cp.conversation_id,
    count(m.id) as unread_count
from public.conversation_participants cp
join public.messages m on m.conversation_id = cp.conversation_id
where m.created_at > cp.last_read_at
and m.sender_id != cp.user_id
group by cp.user_id, cp.conversation_id;
