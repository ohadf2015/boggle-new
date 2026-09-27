-- Migration: Restrict player_progression and player_inventory writes to service_role only
-- Sprint 1 Security Fix (Task 4): Prevent direct client mutations of sensitive progression columns.
-- The adventure complete API uses the service_role key server-side; no client should be able to
-- UPDATE player_progression or player_inventory directly.

-- ============================================================
-- player_progression: restrict UPDATE/INSERT to service_role
-- ============================================================

-- Drop existing permissive UPDATE policy that allows any authenticated user to update their own row
-- (policy name from migration 049_adventure_mode.sql)
DROP POLICY IF EXISTS "Users can update own progression" ON player_progression;
DROP POLICY IF EXISTS "users_update_own_progression" ON player_progression;

-- Re-create UPDATE policy restricted to service_role only.
-- All writes go through the /api/adventure/complete server-side handler.
CREATE POLICY "service_role_update_progression"
  ON player_progression
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- INSERT: also restrict to service_role (initial row created by server-side handler)
DROP POLICY IF EXISTS "Users can insert own progression" ON player_progression;
DROP POLICY IF EXISTS "users_insert_own_progression" ON player_progression;

CREATE POLICY "service_role_insert_progression"
  ON player_progression
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- SELECT: keep existing policy so clients can still read their own progression for display
-- (no change needed — SELECT policy remains authenticated-user-scoped)

-- ============================================================
-- player_inventory: restrict UPDATE/INSERT to service_role
-- ============================================================

DROP POLICY IF EXISTS "Users can update own inventory" ON player_inventory;
DROP POLICY IF EXISTS "users_update_own_inventory" ON player_inventory;

CREATE POLICY "service_role_update_inventory"
  ON player_inventory
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can insert own inventory" ON player_inventory;
DROP POLICY IF EXISTS "users_insert_own_inventory" ON player_inventory;

CREATE POLICY "service_role_insert_inventory"
  ON player_inventory
  FOR INSERT
  TO service_role
  WITH CHECK (true);
