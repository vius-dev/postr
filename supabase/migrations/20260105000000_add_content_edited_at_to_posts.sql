-- Add content_edited_at column to posts table
-- This allows us to track true content modifications separate from generic updated_at bumps

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS content_edited_at TIMESTAMPTZ DEFAULT now();

-- Initialize existing posts: content_edited_at = created_at
UPDATE public.posts SET content_edited_at = created_at WHERE content_edited_at IS NULL;
