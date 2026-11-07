-- Wordfall (Blast v2) was removed; its tables had no reader. Rows kept in a locked backup.
CREATE TABLE IF NOT EXISTS public.wordfall_drop_backup_20261107 AS
  SELECT 'blast_progress'::text AS source, to_jsonb(t.*) AS row FROM public.blast_progress t
  UNION ALL SELECT 'blast_level_clears', to_jsonb(t.*) FROM public.blast_level_clears t
  UNION ALL SELECT 'blast_chests', to_jsonb(t.*) FROM public.blast_chests t;
ALTER TABLE public.wordfall_drop_backup_20261107 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wordfall_drop_backup_20261107 FROM anon, authenticated;

DROP FUNCTION IF EXISTS public.increment_blast_progress(uuid, numeric, integer, integer);
DROP TABLE IF EXISTS public.blast_level_clears;
DROP TABLE IF EXISTS public.blast_chests;
DROP TABLE IF EXISTS public.blast_progress;
