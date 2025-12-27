
-- Migration: 20231227000016_function_hardening_v2.sql
-- Goal: Harden remaining SECURITY DEFINER functions (handle_new_user_settings, is_reserved_username)

-- 1. handle_new_user_settings
ALTER FUNCTION public.handle_new_user_settings() SET search_path = '';

-- 2. is_reserved_username
ALTER FUNCTION public.is_reserved_username(text) SET search_path = '';
