-- =============================================
-- LOCKDOWN: profiles RLS write policies + privileged column guard
-- Migration: 20260811120000_lockdown_profiles_rls
--
-- Fixes F-001 (CRITICAL, security audit 2026-08-11, validated on prod):
-- migration 006_fix_profiles_update_rls opened profiles UPDATE/INSERT to the
-- anonymous role ("server (anon key)" path). The shipped anon key allowed an
-- unauthenticated attacker to UPDATE/DELETE any of the ~349 profile rows:
-- set is_admin/admin_role, inflate total_coins, unban themselves, vandalize
-- other players. Proven with a no-op PATCH on a real row (HTTP 200).
--
-- Changes:
-- 1. Replace the permissive write policies with owner-only, authenticated-only
--    policies. Anon has no session (auth.uid() IS NULL) so every anon write is
--    denied. The backend writes via the service role / SECURITY DEFINER RPCs,
--    which bypass RLS, so game flows are unaffected.
-- 2. Revoke the DELETE table grant from client roles (belt-and-braces; the
--    USING(false) policy already blocked it).
-- 3. BEFORE INSERT/UPDATE trigger rejecting changes to privileged columns
--    (is_admin, admin_role, user_role, total_coins, lifetime_coins_earned,
--    is_banned, banned_until, ban_reason, free_hints_available) when the writer
--    is a direct PostgREST client role (anon/authenticated).
--    Pass-through writers:
--      - service_role (backend supabase-js client, bypasses RLS anyway)
--      - postgres / direct pg connections (drizzle backend, migrations)
--      - SECURITY DEFINER RPCs (award_coins, sync_coins, apply_prestige,
--        admin_bulk_ban_players, handle_new_user, ...) — current_user is the
--        function owner (postgres) inside definer context.
-- =============================================

-- =============================================
-- 1. STRICT RLS WRITE POLICIES
-- =============================================

DROP POLICY IF EXISTS "Users and server can update profiles" ON profiles;
DROP POLICY IF EXISTS "Users and server can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users cannot delete profiles directly" ON profiles;

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT TO authenticated
    WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE TO authenticated
    USING ((select auth.uid()) = id)
    WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users cannot delete profiles directly"
    ON profiles FOR DELETE TO authenticated
    USING (false);

COMMENT ON POLICY "Users can update own profile" ON profiles IS
    'Owner-only updates, authenticated sessions only. Server writes go through the service role or SECURITY DEFINER RPCs (lockdown 20260811, fixes F-001).';
COMMENT ON POLICY "Users can insert own profile" ON profiles IS
    'Owner-only inserts, authenticated sessions only (lockdown 20260811, fixes F-001).';

-- =============================================
-- 2. REVOKE DELETE GRANT FROM CLIENT ROLES
-- =============================================

REVOKE DELETE ON public.profiles FROM anon, authenticated;

-- =============================================
-- 3. PRIVILEGED COLUMN GUARD TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION public.guard_profiles_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only constrain direct PostgREST table writes from client roles.
  -- Inside SECURITY DEFINER functions current_user is the function owner
  -- (postgres); service_role and direct pg connections are not client roles,
  -- so every server-side writer passes through unchanged.
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'UPDATE' THEN
      IF NEW.is_admin              IS DISTINCT FROM OLD.is_admin
         OR NEW.admin_role         IS DISTINCT FROM OLD.admin_role
         OR NEW.user_role          IS DISTINCT FROM OLD.user_role
         OR NEW.total_coins        IS DISTINCT FROM OLD.total_coins
         OR NEW.lifetime_coins_earned IS DISTINCT FROM OLD.lifetime_coins_earned
         OR NEW.is_banned          IS DISTINCT FROM OLD.is_banned
         OR NEW.banned_until       IS DISTINCT FROM OLD.banned_until
         OR NEW.ban_reason         IS DISTINCT FROM OLD.ban_reason
         OR NEW.free_hints_available IS DISTINCT FROM OLD.free_hints_available
      THEN
        RAISE EXCEPTION 'protected profile fields are server-managed'
            USING ERRCODE = '42501';
      END IF;
    ELSIF TG_OP = 'INSERT' THEN
      -- New client-created profiles must carry the column defaults.
      IF NEW.is_admin              IS DISTINCT FROM false
         OR NEW.admin_role         IS NOT NULL
         OR NEW.user_role          IS DISTINCT FROM 'student'::user_role
         OR NEW.total_coins        IS DISTINCT FROM 0
         OR NEW.lifetime_coins_earned IS DISTINCT FROM 0
         OR NEW.is_banned          IS DISTINCT FROM false
         OR NEW.banned_until       IS NOT NULL
         OR NEW.ban_reason         IS NOT NULL
         OR NEW.free_hints_available IS DISTINCT FROM 3
      THEN
        RAISE EXCEPTION 'protected profile fields are server-managed'
            USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS guard_profiles_privileged_columns ON profiles;
CREATE TRIGGER guard_profiles_privileged_columns
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_profiles_privileged_columns();

COMMENT ON FUNCTION public.guard_profiles_privileged_columns() IS
    'Rejects client-role changes to privileged profiles columns (admin, coins, ban state, free hints). Server writers (service_role, SECURITY DEFINER RPCs, direct pg) pass through. Lockdown 20260811, fixes F-001.';
