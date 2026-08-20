-- guard_profiles_privileged_columns runs with SET search_path TO '' (hardened in
-- 20260815030000_harden_guard_profiles_search_path.sql — correctly; an empty search_path is
-- what stops a caller from shadowing the objects a security-sensitive trigger resolves).
--
-- But its INSERT branch casts to the enum by bare name:
--
--     NEW.user_role IS DISTINCT FROM 'student'::user_role
--
-- With no search_path there is nothing to resolve `user_role` against, so the trigger itself
-- raises `type "user_role" does not exist` and the write dies. The UPDATE branch only compares
-- NEW against OLD and names no type, which is why UPDATEs kept working and this stayed hidden
-- from 2026-08-15 until now.
--
-- Effect: every INSERT into public.profiles by a client role (anon / authenticated) failed.
-- And because a BEFORE INSERT trigger fires on the INSERT half of an upsert before the
-- conflict is resolved, `profiles.upsert(...)` from the browser failed too — whether or not
-- the row already existed. Ordinary signup was spared: on_auth_user_created creates that row
-- in a SECURITY DEFINER context where current_user is postgres, so the guard short-circuits
-- at its `current_user IN ('anon','authenticated')` check.
--
-- Surfaced by the classroom-join guest path, which upserts a display name for the anonymous
-- student it has just created. Fix schema-qualifies the type; the hardened search_path stays,
-- and the guard's behaviour is otherwise byte-identical.
--
-- Verified live afterwards, as an anonymous user via the public anon key: the guest profile
-- upsert succeeds, the teacher sees the guest's name, and self-promotion to teacher is still
-- refused through BOTH update and upsert.
CREATE OR REPLACE FUNCTION public.guard_profiles_privileged_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
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
      -- public.user_role, not user_role: search_path is empty in here.
      IF NEW.is_admin              IS DISTINCT FROM false
         OR NEW.admin_role         IS NOT NULL
         OR NEW.user_role          IS DISTINCT FROM 'student'::public.user_role
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
