-- Tables where a `FOR ALL` permissive policy coexists with `FOR <cmd>`
-- permissive policies on the same role generate multiple_permissive
-- hits because PostgREST evaluates both per row.
--
-- Split the ALL policy into 4 cmd-specific equivalents, OR-merge each
-- with the matching existing specific-cmd policy, drop the originals.
-- For ALL policies whose WITH CHECK is NULL, Postgres uses USING in
-- its place during INSERT/UPDATE — we replicate that here.

DO $$
DECLARE
  g record;
  all_pol record;
  cmd_lit text;
  spec record;
  merged_using text;
  merged_check text;
  new_name text;
  cmds text[] := ARRAY['SELECT','INSERT','UPDATE','DELETE'];
BEGIN
  FOR g IN
    SELECT tablename, roles
    FROM pg_policies
    WHERE schemaname='public' AND permissive='PERMISSIVE'
    GROUP BY tablename, roles
    HAVING count(*) FILTER (WHERE cmd='ALL') > 0
       AND count(*) FILTER (WHERE cmd<>'ALL') > 0
  LOOP
    SELECT policyname, qual, with_check
      INTO all_pol
      FROM pg_policies
     WHERE schemaname='public' AND tablename=g.tablename
       AND roles=g.roles AND cmd='ALL' AND permissive='PERMISSIVE'
     ORDER BY policyname LIMIT 1;

    FOREACH cmd_lit IN ARRAY cmds
    LOOP
      spec := NULL;
      SELECT policyname, qual, with_check
        INTO spec
        FROM pg_policies
       WHERE schemaname='public' AND tablename=g.tablename
         AND roles=g.roles AND cmd=cmd_lit AND permissive='PERMISSIVE'
       LIMIT 1;

      merged_using := NULL;
      merged_check := NULL;

      IF cmd_lit IN ('SELECT','DELETE','UPDATE') THEN
        IF all_pol.qual IS NOT NULL THEN
          merged_using := '(' || all_pol.qual || ')';
        END IF;
        IF spec.qual IS NOT NULL THEN
          merged_using := CASE WHEN merged_using IS NULL
                               THEN '(' || spec.qual || ')'
                               ELSE merged_using || ' OR (' || spec.qual || ')' END;
        END IF;
      END IF;

      IF cmd_lit IN ('INSERT','UPDATE') THEN
        IF all_pol.with_check IS NOT NULL THEN
          merged_check := '(' || all_pol.with_check || ')';
        ELSIF all_pol.qual IS NOT NULL THEN
          merged_check := '(' || all_pol.qual || ')';
        END IF;
        IF spec.with_check IS NOT NULL THEN
          merged_check := CASE WHEN merged_check IS NULL
                                THEN '(' || spec.with_check || ')'
                                ELSE merged_check || ' OR (' || spec.with_check || ')' END;
        END IF;
      END IF;

      IF spec.policyname IS NOT NULL THEN
        EXECUTE format('DROP POLICY %I ON public.%I',
                       spec.policyname, g.tablename);
      END IF;

      IF merged_using IS NOT NULL OR merged_check IS NOT NULL THEN
        new_name := substr(format('rls_%s_%s_%s',
                                  g.tablename, lower(cmd_lit),
                                  array_to_string(g.roles, '_')), 1, 62);
        EXECUTE format(
          'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR %s TO %s',
          new_name, g.tablename, cmd_lit, array_to_string(g.roles, ', '))
          || CASE WHEN merged_using IS NOT NULL
                  THEN format(' USING (%s)', merged_using) ELSE '' END
          || CASE WHEN merged_check IS NOT NULL
                  THEN format(' WITH CHECK (%s)', merged_check) ELSE '' END;
      END IF;
    END LOOP;

    EXECUTE format('DROP POLICY %I ON public.%I',
                   all_pol.policyname, g.tablename);
  END LOOP;
END $$;
