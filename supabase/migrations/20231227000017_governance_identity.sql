
-- Migration: 20231227000017_governance_identity.sql
-- Goal: Implement Governance & Identity System (Reserved Usernames, Official Logos, Typed Verification)

-- 1. ENHANCE PROFILES TABLE
-- Add columns for identity classification and authoritative metadata
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS verification_type text,
ADD COLUMN IF NOT EXISTS official_logo text,
ADD COLUMN IF NOT EXISTS username_status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS authority_start timestamptz,
ADD COLUMN IF NOT EXISTS authority_end timestamptz;

-- Add check constraints for valid types
ALTER TABLE public.profiles
ADD CONSTRAINT valid_verification_type 
CHECK (verification_type IN ('politician', 'political_party', 'government_agency', 'civic_org', 'journalist', 'brand')),
ADD CONSTRAINT valid_username_status
CHECK (username_status IN ('active', 'reserved', 'archived', 'released'));

-- 2. ENHANCE RESERVED_USERNAMES TABLE
-- Ensure assignment audit columns exist
ALTER TABLE public.reserved_usernames
ADD COLUMN IF NOT EXISTS assigned_user_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
ADD COLUMN IF NOT EXISTS assignment_reason text;

-- 3. ADMIN RPC: Assign Reserved Username
-- Bypasses standard signup constraints, requires manual admin execution
CREATE OR REPLACE FUNCTION public.assign_reserved_username(
    p_user_id uuid,
    p_username text,
    p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- 1. Update the profile
    UPDATE public.profiles
    SET 
        username = p_username,
        username_status = 'active',
        is_verified = true
    WHERE id = p_user_id;

    -- 2. Log assignment in reserved_usernames
    UPDATE public.reserved_usernames
    SET 
        assigned_user_id = p_user_id,
        assigned_at = now(),
        assignment_reason = p_reason
    WHERE lower(username) = lower(p_username);
END;
$$;

-- 4. ADMIN RPC: Set Official Identity
-- Admin-only function to set authoritative metadata
CREATE OR REPLACE FUNCTION public.set_official_identity(
    p_user_id uuid,
    p_logo text,
    p_type text,
    p_authority_start timestamptz DEFAULT now(),
    p_authority_end timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.profiles
    SET 
        official_logo = p_logo,
        verification_type = p_type,
        is_verified = true,
        authority_start = p_authority_start,
        authority_end = p_authority_end
    WHERE id = p_user_id;
END;
$$;
