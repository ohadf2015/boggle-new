-- Fix: increment_blast_progress RETURNS TABLE OUT names shadowed the table
-- columns, making the UPDATE's RHS column refs ambiguous (42702) → every call
-- threw, so max_level_cleared / coins / chest_progress never persisted and the
-- chest never filled (blast_chests stayed empty). The clear-level route swallowed
-- the RPC error, so the breakage was invisible for ~25 days.
-- Same class as fix_sync_coins_qualify_table_refs. Table-qualify every RHS ref.
CREATE OR REPLACE FUNCTION public.increment_blast_progress(
  p_user_id uuid,
  p_chest_progress_delta numeric,
  p_next_level integer,
  p_coins_delta integer
)
RETURNS TABLE(total_coins_earned_blast integer, current_chest_progress numeric, current_chest_number integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  UPDATE public.blast_progress AS bp
  SET
    current_level            = GREATEST(bp.current_level, p_next_level),
    max_level_cleared        = GREATEST(bp.max_level_cleared, p_next_level - 1),
    total_coins_earned_blast = bp.total_coins_earned_blast + p_coins_delta,
    current_chest_progress   = LEAST(1.00, bp.current_chest_progress + p_chest_progress_delta),
    updated_at               = now()
  WHERE bp.user_id = p_user_id;

  RETURN QUERY
  SELECT bp.total_coins_earned_blast,
         bp.current_chest_progress,
         bp.current_chest_number
  FROM public.blast_progress bp
  WHERE bp.user_id = p_user_id;
END;
$function$;
