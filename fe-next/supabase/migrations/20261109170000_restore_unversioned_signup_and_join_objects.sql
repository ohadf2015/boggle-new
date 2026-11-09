-- Three objects that prod depends on were created outside the migration
-- history, so a database rebuilt from this folder (a Supabase branch, a
-- local stack, a disaster-recovery restore) could not sign anyone up or
-- let a student join a class. Found on 2026-11-09 by replaying every
-- migration onto a fresh Supabase branch and walking the Education flows.
--
--   1. get_current_season_id(): sync_profile_to_leaderboard() calls it, so
--      every profile insert (and with it every signup) failed.
--   2. on_auth_user_created: handle_new_user() existed but nothing called
--      it, so new auth users never got a profiles row.
--   3. lookup_classroom_by_join_code(text): the join, preview and
--      join-code resolve routes call it; 20260830090000 only GRANTs it.
--
-- Definitions are copied verbatim from prod, so on prod this is a no-op.

CREATE OR REPLACE FUNCTION public.get_current_season_id()
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT id
  FROM seasons
  WHERE now() >= start_date AND now() < end_date
  ORDER BY start_date DESC
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.lookup_classroom_by_join_code(p_join_code text)
 RETURNS TABLE(id uuid, name text, language text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Only return if exact match found (case-insensitive)
    RETURN QUERY
    SELECT c.id, c.name, c.language
    FROM classrooms c
    WHERE UPPER(c.join_code) = UPPER(p_join_code)
    LIMIT 1;
END;
$function$;

REVOKE ALL ON FUNCTION public.lookup_classroom_by_join_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_classroom_by_join_code(text) TO anon, authenticated, service_role;

-- Only create the trigger when it is missing, so prod's live trigger is
-- never dropped, even for an instant.
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created' AND tgrelid = 'auth.users'::regclass
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END
$do$;
