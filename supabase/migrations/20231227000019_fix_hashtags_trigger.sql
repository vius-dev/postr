
-- Fix Hashtag Extraction Trigger
-- Migration: 20231227000019_fix_hashtags_trigger.sql

create or replace function public.extract_hashtags()
returns trigger as $$
declare
    v_tag text;
begin
    -- regexp_matches returns a set of text arrays (text[]).
    -- We must access the first element of the array [1] before passing to ltrim.
    for v_tag in select distinct ltrim(t.match[1], '#') from regexp_matches(new.content, '#[A-Za-z0-9_]+', 'g') as t(match)
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

-- Secure the search path as per hardening policy
ALTER FUNCTION public.extract_hashtags() SET search_path = '';
