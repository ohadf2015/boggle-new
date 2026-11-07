-- Wordfall (Blast v2) was removed; its tables had no reader. Rows kept in a locked backup.
-- Idempotent: prod already had the backup made and the tables dropped outside the
-- ledger, so a plain CREATE TABLE ... AS SELECT failed on the missing source tables
-- and blocked every later migration. The backup is only built while its sources exist.
DO $$
BEGIN
  IF to_regclass('public.wordfall_drop_backup_20261107') IS NULL
     AND to_regclass('public.blast_progress') IS NOT NULL
     AND to_regclass('public.blast_level_clears') IS NOT NULL
     AND to_regclass('public.blast_chests') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE TABLE public.wordfall_drop_backup_20261107 AS
        SELECT 'blast_progress'::text AS source, to_jsonb(t.*) AS row FROM public.blast_progress t
        UNION ALL SELECT 'blast_level_clears', to_jsonb(t.*) FROM public.blast_level_clears t
        UNION ALL SELECT 'blast_chests', to_jsonb(t.*) FROM public.blast_chests t
    $sql$;
  END IF;
  IF to_regclass('public.wordfall_drop_backup_20261107') IS NOT NULL THEN
    ALTER TABLE public.wordfall_drop_backup_20261107 ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.wordfall_drop_backup_20261107 FROM anon, authenticated;
  END IF;
END
$$;

DROP FUNCTION IF EXISTS public.increment_blast_progress(uuid, numeric, integer, integer);
DROP TABLE IF EXISTS public.blast_level_clears;
DROP TABLE IF EXISTS public.blast_chests;
DROP TABLE IF EXISTS public.blast_progress;
