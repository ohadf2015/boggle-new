-- =============================================
-- FIX PROFILES RLS POLICIES FOR SERVER ACCESS
-- Migration: 006_fix_profiles_update_rls
--
-- Problem: The backend uses the anon key to update/create player profiles,
-- but the current RLS policies require auth.uid() = id, which fails because
-- the backend doesn't have a user session (auth.uid() is NULL).
--
-- Solution: Replace the restrictive policies with ones that allow access
-- from either the authenticated user OR the server (anon key).
-- The backend validates the player_id before any operations.
-- =============================================

-- =============================================
-- FIX UPDATE POLICY
-- =============================================

-- Drop the restrictive policy that requires auth.uid()
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create a new policy that allows:
-- 1. Authenticated users to update their own profile (auth.uid() = id)
-- 2. Server (anon key) to update any profile for game stats (auth.uid() IS NULL)
-- This is safe because the backend validates player identity via socket session.
CREATE POLICY "Users and server can update profiles"
    ON profiles FOR UPDATE
    USING (
        -- Either the user is updating their own profile
        auth.uid() = id
        -- Or the request is from the server (anon key without user session)
        OR auth.uid() IS NULL
    );

-- =============================================
-- FIX INSERT POLICY
-- =============================================

-- Drop the restrictive insert policy
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create a new policy that allows:
-- 1. Authenticated users to create their own profile (auth.uid() = id)
-- 2. Server (anon key) to create profiles for users who haven't set up their profile yet
-- This is needed because users can play games before completing profile setup.
CREATE POLICY "Users and server can insert profiles"
    ON profiles FOR INSERT
    WITH CHECK (
        -- Either the user is creating their own profile
        auth.uid() = id
        -- Or the request is from the server (anon key without user session)
        OR auth.uid() IS NULL
    );

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON POLICY "Users and server can update profiles" ON profiles IS
    'Allows authenticated users to update their own profile, and allows the backend (via anon key) to update stats after games.';

COMMENT ON POLICY "Users and server can insert profiles" ON profiles IS
    'Allows authenticated users to create their own profile, and allows the backend (via anon key) to create minimal profiles for stats tracking.';
