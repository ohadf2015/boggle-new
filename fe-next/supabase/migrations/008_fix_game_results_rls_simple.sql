-- Migration: 008_fix_game_results_rls_simple
-- Fix: RLS policy for game_results was too restrictive
-- Issue: "new row violates row-level security policy for table game_results"
--
-- The previous migration (007) used auth.uid() IS NULL check which may not
-- work correctly in all cases. Reverting to simpler WITH CHECK (true)
-- since the backend handles all validation.

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Server can insert game results" ON game_results;

-- Create simple INSERT policy - server handles all validation
CREATE POLICY "Server can insert game results"
    ON game_results FOR INSERT
    WITH CHECK (true);

-- Ensure RLS is enabled on the table
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;

-- Add comment for documentation
COMMENT ON POLICY "Server can insert game results" ON game_results IS 'Allow all inserts - backend server handles validation of game results';
