-- AUTO-POPULATE POLLS FROM POST JSON
-- Migration: 20231229000023_auto_populate_polls.sql

-- Function to handle new poll posts and populate relational tables
create or replace function public.populate_poll_from_json()
returns trigger as $$
declare
    v_poll_json jsonb;
    v_choice jsonb;
    v_idx int;
begin
    -- Only process functionality if it is a poll and has json data
    if new.type = 'poll' and new.poll_json is not null then
        v_poll_json := new.poll_json;

        -- 1. Insert into public.polls
        insert into public.polls (post_id, question, closes_at, created_at)
        values (
            new.id,
            v_poll_json->>'question',
            (v_poll_json->>'expires_at')::timestamptz,
            new.created_at
        )
        on conflict (post_id) do nothing; -- Idempotency

        -- 2. Insert choices into public.poll_options
        -- Note: We use the array index as order_index
        v_idx := 0;
        for v_choice in select * from jsonb_array_elements(v_poll_json->'choices')
        loop
            insert into public.poll_options (poll_id, label, vote_count, order_index)
            values (
                new.id,
                v_choice->>'text',
                (v_choice->>'vote_count')::int,
                v_idx
            );
            v_idx := v_idx + 1;
        end loop;
    end if;

    return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Create the trigger
drop trigger if exists on_post_created_populate_poll on public.posts;
create trigger on_post_created_populate_poll
    after insert on public.posts
    for each row execute procedure public.populate_poll_from_json();
