-- Rewrite RLS policy expressions so `auth.uid()`, `auth.jwt()`,
-- `auth.role()`, `auth.email()` become `(SELECT auth.fn())`.
-- This converts per-row STABLE function calls into a single initplan
-- evaluation per statement (Supabase advisor: auth_rls_initplan).
--
-- Strategy: idempotent protect→replace→restore. Swap already-wrapped
-- forms with a sentinel, wrap the raw remainder, then put the
-- sentinels back. Safe to re-run (no-op if all policies already use
-- the wrapped form).

DO $$
DECLARE
  r record;
  new_qual text;
  new_check text;
  fn text;
  changed boolean;
  alter_sql text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND ( (qual IS NOT NULL AND qual ~ 'auth\.(uid|jwt|role|email)\(\)')
         OR (with_check IS NOT NULL AND with_check ~ 'auth\.(uid|jwt|role|email)\(\)') )
  LOOP
    new_qual  := r.qual;
    new_check := r.with_check;

    FOREACH fn IN ARRAY ARRAY['uid','jwt','role','email']
    LOOP
      IF new_qual IS NOT NULL THEN
        new_qual := regexp_replace(
          new_qual,
          '\(\s*SELECT\s+auth\.' || fn || '\(\)[^)]*\)',
          '__WRAPPED_AUTH_' || fn || '__',
          'gi'
        );
        new_qual := regexp_replace(
          new_qual,
          'auth\.' || fn || '\(\)',
          '(SELECT auth.' || fn || '())',
          'g'
        );
        new_qual := replace(
          new_qual,
          '__WRAPPED_AUTH_' || fn || '__',
          '(SELECT auth.' || fn || '())'
        );
      END IF;

      IF new_check IS NOT NULL THEN
        new_check := regexp_replace(
          new_check,
          '\(\s*SELECT\s+auth\.' || fn || '\(\)[^)]*\)',
          '__WRAPPED_AUTH_' || fn || '__',
          'gi'
        );
        new_check := regexp_replace(
          new_check,
          'auth\.' || fn || '\(\)',
          '(SELECT auth.' || fn || '())',
          'g'
        );
        new_check := replace(
          new_check,
          '__WRAPPED_AUTH_' || fn || '__',
          '(SELECT auth.' || fn || '())'
        );
      END IF;
    END LOOP;

    changed := (new_qual  IS DISTINCT FROM r.qual)
            OR (new_check IS DISTINCT FROM r.with_check);
    IF NOT changed THEN
      CONTINUE;
    END IF;

    alter_sql := format('ALTER POLICY %I ON %I.%I',
                        r.policyname, r.schemaname, r.tablename);
    IF new_qual IS NOT NULL THEN
      alter_sql := alter_sql || format(' USING (%s)', new_qual);
    END IF;
    IF new_check IS NOT NULL THEN
      alter_sql := alter_sql || format(' WITH CHECK (%s)', new_check);
    END IF;

    EXECUTE alter_sql;
  END LOOP;
END $$;
