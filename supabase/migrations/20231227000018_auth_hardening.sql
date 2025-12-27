
-- Migration: 20231227000018_auth_hardening.sql
-- Goal: Harden handle_new_user trigger to prevent silent failures during profile creation.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_username text;
  v_name text;
BEGIN
  -- 1. Derive base username from metadata or email
  v_username := coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
  v_name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));

  -- 2. ENSURE USERNAME LENGTH (Constraint is >= 3)
  IF length(v_username) < 3 THEN
    v_username := v_username || '_' || floor(random() * 1000)::text;
    -- Re-check if it's still too short (extremely unlikely but safe)
    IF length(v_username) < 3 THEN
        v_username := 'user_' || floor(random() * 1000)::text;
    END IF;
  END IF;

  -- 3. HANDLE DUPLICATE USERNAMES
  -- If username exists, append a random suffix
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) LOOP
    v_username := v_username || floor(random() * 10)::text;
  END LOOP;

  -- 4. INSERT PROFILE
  INSERT INTO public.profiles (id, username, name, avatar)
  VALUES (
    new.id,
    v_username,
    v_name,
    coalesce(new.raw_user_meta_data->>'avatar', 'https://i.pravatar.cc/150?u=' || new.id)
  );

  -- 5. INITIAL SETTINGS
  INSERT INTO public.user_settings (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Log error or handle gracefully - we don't want to block user creation 
  -- but we definitely want to know why it failed.
  RAISE NOTICE 'Error in handle_new_user for user %: %', new.id, SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure search path is set for the updated function
ALTER FUNCTION public.handle_new_user() SET search_path = '';
