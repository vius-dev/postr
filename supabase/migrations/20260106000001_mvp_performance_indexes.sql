-- PERFORMANCE INDEXES: Phase 8
-- Migration: 20260106000001_mvp_performance_indexes.sql

-- Enable extensions in a dedicated schema for security
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- Grant usage (Supabase usually does this, but being explicit is safer for migration code)
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

-- 1. NOTIFICATIONS
-- Support for pagination and filtering by recipient
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created_at 
ON public.notifications (recipient_id, created_at DESC);

-- 2. CONVERSATIONS
-- Support for inbox reordering (sorting by updated_at)
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at 
ON public.conversations (updated_at DESC);

-- 3. POSTS
-- Support for reply context (parent_id joins)
CREATE INDEX IF NOT EXISTS idx_posts_parent_id 
ON public.posts (parent_id);

-- 4. PROFILES
-- Ensure fast lookups by username (used in search and profiles)
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm 
ON public.profiles USING gin (username gin_trgm_ops);

-- Ensure fast id lookups (already primary key, but good to be explicit for composite queries)
-- (Omitted as PK already has index)
