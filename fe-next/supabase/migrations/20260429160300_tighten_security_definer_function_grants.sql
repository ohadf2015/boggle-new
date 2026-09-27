-- Lock down anon access to SECURITY DEFINER functions in public.
-- Earlier "REVOKE FROM anon" was a no-op because anon inherits
-- EXECUTE via PUBLIC (Postgres default grant). Pattern:
--   1. revoke from PUBLIC and anon
--   2. trigger fns: leave revoked, no role needs EXECUTE
--   3. non-trigger fns: grant to authenticated + service_role so
--      client RPCs and the backend keep working.

DO $$
DECLARE
  r record;
  ident text;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args,
           pg_catalog.format_type(p.prorettype, NULL) AS rettype
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    ident := format('%I.%I(%s)', r.nspname, r.proname, r.args);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', ident);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', ident);

    IF r.rettype <> 'trigger' THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', ident);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', ident);
    ELSE
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', ident);
    END IF;
  END LOOP;
END $$;
