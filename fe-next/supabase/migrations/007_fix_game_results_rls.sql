-- Migration: Fix game_results RLS policy for server inserts
-- Issue: "new row violates row-level security policy for table game_results"
-- The backend uses the anonymous key (no auth session), so auth.uid() is NULL
-- This migration updates the INSERT policy to explicitly allow server inserts

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Server can insert game results" ON game_results;

-- Create new INSERT policy that explicitly allows:
-- 1. Server inserts via anon key (auth.uid() IS NULL)
-- 2. Authenticated users inserting their own results (auth.uid() = player_id)
CREATE POLICY "Server can insert game results"
    ON game_results FOR INSERT
    WITH CHECK (
        -- Server inserting via anon key (no user session)
        auth.uid() IS NULL
        -- OR authenticated user inserting their own result
        OR auth.uid() = player_id
    );

-- Ensure RLS is enabled on the table
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;
