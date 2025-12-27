
-- Migration: 20231227000015_function_hardening.sql
-- Goal: Harden all SECURITY DEFINER functions by setting fixed search_path to prevent hijacking.

-- 1. handle_new_user
ALTER FUNCTION public.handle_new_user() SET search_path = '';

-- 2. update_reaction_counts
ALTER FUNCTION public.update_reaction_counts() SET search_path = '';

-- 3. handle_new_message
ALTER FUNCTION public.handle_new_message() SET search_path = '';

-- 4. increment_vote_count
ALTER FUNCTION public.increment_vote_count() SET search_path = '';

-- 5. handle_updated_at
ALTER FUNCTION public.handle_updated_at() SET search_path = '';

-- 6. vote_on_poll
ALTER FUNCTION public.vote_on_poll(uuid, uuid, int) SET search_path = '';

-- 7. update_post_aggregates
ALTER FUNCTION public.update_post_aggregates() SET search_path = '';

-- 8. notify_on_reaction
ALTER FUNCTION public.notify_on_reaction() SET search_path = '';

-- 9. notify_on_follow
ALTER FUNCTION public.notify_on_follow() SET search_path = '';

-- 10. extract_hashtags
ALTER FUNCTION public.extract_hashtags() SET search_path = '';

-- 11. get_user_stats
ALTER FUNCTION public.get_user_stats(uuid) SET search_path = '';

-- 12. handle_mentions
ALTER FUNCTION public.handle_mentions() SET search_path = '';

-- 13. handle_new_user_settings
ALTER FUNCTION public.handle_new_user_settings() SET search_path = '';

-- 14. is_reserved_username
ALTER FUNCTION public.is_reserved_username(text) SET search_path = '';
