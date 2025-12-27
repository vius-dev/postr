
-- API SYNC V2: FIXING RPC DISCREPANCIES & AGGREGATE TRIGGERS
-- Migration: 20231227000011_api_sync_v2.sql

-- 1. FIX REPORTS TABLE
alter table public.reports 
add column if not exists report_type text;

-- 2. IMPLEMENT vote_on_poll RPC
create or replace function public.vote_on_poll(
    p_post_id uuid,
    p_user_id uuid,
    p_choice_index int
)
returns void as $$
declare
    v_option_id uuid;
begin
    -- Get the option ID for the choice index
    select id into v_option_id
    from public.poll_options
    where poll_id = p_post_id
    order by order_index
    offset p_choice_index
    limit 1;

    if v_option_id is null then
        raise exception 'Invalid choice index';
    end if;

    -- Insert the vote
    insert into public.poll_votes (poll_id, option_id, user_id)
    values (p_post_id, v_option_id, p_user_id);
end;
$$ language plpgsql security definer;

-- 3. ENHANCE REACTION AGGREGATES TRIGGER
-- We need to handle LAUGH, and also REPOSTS and COMMENTS (from posts table)

-- A. Update reaction trigger to handle LAUGH
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
    elsif (new.type = 'LAUGH') then
        update public.reaction_aggregates set laugh_count = laugh_count + 1 where subject_id = new.subject_id;
    end if;
  elsif (TG_OP = 'DELETE') then
     if (old.type = 'LIKE') then
        update public.reaction_aggregates set like_count = like_count - 1 where subject_id = old.subject_id;
    elsif (old.type = 'DISLIKE') then
        update public.reaction_aggregates set dislike_count = dislike_count - 1 where subject_id = old.subject_id;
    elsif (old.type = 'LAUGH') then
        update public.reaction_aggregates set laugh_count = laugh_count - 1 where subject_id = old.subject_id;
    end if;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- B. Create trigger for Posts table to handle repost_count and comment_count
create or replace function public.update_post_aggregates()
returns trigger as $$
begin
  -- 1. Handle Reposts
  if (new.type = 'repost' and new.parent_id is not null) or (old.type = 'repost' and old.parent_id is not null) then
    declare
        v_target_id uuid := coalesce(new.parent_id, old.parent_id);
    begin
        insert into public.reaction_aggregates (subject_id)
        values (v_target_id)
        on conflict (subject_id) do nothing;

        if (TG_OP = 'INSERT') then
            update public.reaction_aggregates set repost_count = repost_count + 1 where subject_id = v_target_id;
        elsif (TG_OP = 'DELETE') then
            update public.reaction_aggregates set repost_count = repost_count - 1 where subject_id = v_target_id;
        end if;
    end;
  end if;

  -- 2. Handle Comments (Replies)
  if (new.parent_id is not null and (new.type is null or new.type != 'repost')) or (old.parent_id is not null and (old.type is null or old.type != 'repost')) then
    declare
        v_target_id uuid := coalesce(new.parent_id, old.parent_id);
    begin
        insert into public.reaction_aggregates (subject_id)
        values (v_target_id)
        on conflict (subject_id) do nothing;

        if (TG_OP = 'INSERT') then
            update public.reaction_aggregates set comment_count = comment_count + 1 where subject_id = v_target_id;
        elsif (TG_OP = 'DELETE') then
            update public.reaction_aggregates set comment_count = comment_count - 1 where subject_id = v_target_id;
        end if;
    end;
  end if;

  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists on_post_aggregate_change on public.posts;
create trigger on_post_aggregate_change
  after insert or delete on public.posts
  for each row execute procedure public.update_post_aggregates();
