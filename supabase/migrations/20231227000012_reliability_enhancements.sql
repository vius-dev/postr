
-- RELIABILITY & SCALE: AUTOMATED NOTIFICATIONS, HASHTAGS, AND STATS
-- Migration: 20231227000012_reliability_enhancements.sql

-- 1. AUTOMATED NOTIFICATIONS FOR REACTIONS
create or replace function public.notify_on_reaction()
returns trigger as $$
declare
    v_recipient_id uuid;
    v_actor_name text;
    v_post_snippet text;
begin
    -- Get the author of the post (recipient)
    select owner_id, substring(content from 1 for 40) into v_recipient_id, v_post_snippet
    from public.posts
    where id = new.subject_id;

    -- Don't notify if reacting to own post
    if v_recipient_id = new.actor_id then
        return null;
    end if;

    insert into public.notifications (recipient_id, actor_id, type, data)
    values (
        v_recipient_id,
        new.actor_id,
        new.type, -- LIKE, DISLIKE, or LAUGH
        jsonb_build_object(
            'post_id', new.subject_id,
            'post_snippet', v_post_snippet
        )
    );
    return new;
end;
$$ language plpgsql security definer;

create trigger on_reaction_notification
    after insert on public.post_reactions
    for each row execute procedure public.notify_on_reaction();

-- 2. AUTOMATED NOTIFICATIONS FOR FOLLOWS
create or replace function public.notify_on_follow()
returns trigger as $$
begin
    insert into public.notifications (recipient_id, actor_id, type)
    values (new.following_id, new.follower_id, 'FOLLOW');
    return new;
end;
$$ language plpgsql security definer;

create trigger on_follow_notification
    after insert on public.follows
    for each row execute procedure public.notify_on_follow();

-- 3. HASHTAG EXTRACTION TRIGGER
create or replace function public.extract_hashtags()
returns trigger as $$
declare
    v_tag text;
begin
    -- Find all #hashtags in content (Postgres regex)
    for v_tag in select distinct ltrim(t.match, '#') from regexp_matches(new.content, '#[A-Za-z0-9_]+', 'g') as t(match)
    loop
        insert into public.hashtags (tag, usage_count, last_used_at)
        values (v_tag, 1, now())
        on conflict (tag) do update 
        set usage_count = hashtags.usage_count + 1,
            last_used_at = now();
    end loop;
    return new;
end;
$$ language plpgsql security definer;

create trigger on_post_hashtags
    after insert on public.posts
    for each row 
    when (new.content is not null)
    execute procedure public.extract_hashtags();

-- 4. PROFILE STATS RPC
-- Replaces hardcoded 0s in Profile screen
create or replace function public.get_user_stats(p_user_id uuid)
returns json as $$
declare
    v_followers int;
    v_following int;
    v_posts int;
begin
    select count(*) into v_followers from public.follows where following_id = p_user_id;
    select count(*) into v_following from public.follows where follower_id = p_user_id;
    select count(*) into v_posts from public.posts where owner_id = p_user_id and deleted_at is null;

    return json_build_object(
        'followersCount', v_followers,
        'followingCount', v_following,
        'postCount', v_posts
    );
end;
$$ language plpgsql security definer;

-- 5. PERFORMANCE INDICES
create index if not exists idx_posts_owner_id_created on public.posts(owner_id, created_at desc) where deleted_at is null;
create index if not exists idx_follows_follower_id on public.follows(follower_id);
create index if not exists idx_follows_following_id on public.follows(following_id);
create index if not exists idx_notifications_recipient_unread on public.notifications(recipient_id) where is_read = false;
