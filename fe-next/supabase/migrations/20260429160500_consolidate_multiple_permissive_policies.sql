-- Consolidate groups of permissive policies on same (table, role, cmd)
-- into one OR-merged policy. Permissive RLS is OR-evaluated already,
-- so semantics are preserved; performance gain is one expression tree
-- per row instead of N.

DO $$
DECLARE
  g record;
  pol record;
  combined_qual text;
  combined_check text;
  new_name text;
  cmd_clause text;
  roles_csv text;
  create_sql text;
BEGIN
  FOR g IN
    SELECT schemaname, tablename, cmd, roles
    FROM pg_policies
    WHERE schemaname = 'public' AND permissive = 'PERMISSIVE'
    GROUP BY schemaname, tablename, cmd, roles
    HAVING count(*) > 1
  LOOP
    combined_qual  := NULL;
    combined_check := NULL;

    FOR pol IN
      SELECT policyname, qual, with_check
      FROM pg_policies
      WHERE schemaname = g.schemaname
        AND tablename  = g.tablename
        AND cmd        = g.cmd
        AND roles      = g.roles
        AND permissive = 'PERMISSIVE'
      ORDER BY policyname
    LOOP
      IF pol.qual IS NOT NULL THEN
        IF combined_qual IS NULL THEN
          combined_qual := '(' || pol.qual || ')';
        ELSE
          combined_qual := combined_qual || ' OR (' || pol.qual || ')';
        END IF;
      END IF;
      IF pol.with_check IS NOT NULL THEN
        IF combined_check IS NULL THEN
          combined_check := '(' || pol.with_check || ')';
        ELSE
          combined_check := combined_check || ' OR (' || pol.with_check || ')';
        END IF;
      END IF;
    END LOOP;

    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = g.schemaname
        AND tablename  = g.tablename
        AND cmd        = g.cmd
        AND roles      = g.roles
        AND permissive = 'PERMISSIVE'
    LOOP
      EXECUTE format('DROP POLICY %I ON %I.%I',
                     pol.policyname, g.schemaname, g.tablename);
    END LOOP;

    new_name  := substr(format('merged_%s_%s_%s',
                               g.tablename,
                               lower(g.cmd),
                               array_to_string(g.roles, '_')),
                        1, 62);
    cmd_clause := CASE WHEN g.cmd = 'ALL' THEN 'ALL' ELSE g.cmd END;
    roles_csv  := array_to_string(g.roles, ', ');

    create_sql := format('CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR %s TO %s',
                         new_name, g.schemaname, g.tablename, cmd_clause, roles_csv);
    IF combined_qual IS NOT NULL THEN
      create_sql := create_sql || format(' USING (%s)', combined_qual);
    END IF;
    IF combined_check IS NOT NULL THEN
      create_sql := create_sql || format(' WITH CHECK (%s)', combined_check);
    END IF;

    EXECUTE create_sql;
  END LOOP;
END $$;
