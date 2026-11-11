-- Atomic server-side achievement grant: adds each key to profiles.achievement_counts
-- with count 1 only if the player doesn't hold it yet, and returns the keys that
-- were new. One UPDATE, so two concurrent grants can't overwrite each other the
-- way a read-modify-write of the jsonb would. service_role only (server routes,
-- SQL triggers via SECURITY DEFINER); clients never call it.

CREATE OR REPLACE FUNCTION public.grant_achievements(p_user_id uuid, p_keys text[])
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new text[];
BEGIN
  IF p_user_id IS NULL OR p_keys IS NULL OR array_length(p_keys, 1) IS NULL THEN
    RETURN ARRAY[]::text[];
  END IF;

  -- Unlocked precheck: most calls (every h2h row, every friend accept) grant
  -- nothing new, and must not take a profile row lock inside the caller's write.
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p, unnest(p_keys) AS k
    WHERE p.id = p_user_id
      AND NOT ((CASE WHEN jsonb_typeof(p.achievement_counts) = 'object' THEN p.achievement_counts ELSE '{}'::jsonb END) ? k)
  ) THEN
    RETURN ARRAY[]::text[];
  END IF;

  WITH cur AS (
    SELECT CASE WHEN jsonb_typeof(achievement_counts) = 'object' THEN achievement_counts ELSE '{}'::jsonb END AS counts
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE
  )
  SELECT COALESCE(array_agg(DISTINCT k), ARRAY[]::text[]) INTO v_new
  FROM cur, unnest(p_keys) AS k
  WHERE NOT (cur.counts ? k);

  IF array_length(v_new, 1) IS NULL THEN
    RETURN ARRAY[]::text[];
  END IF;

  UPDATE public.profiles
  SET achievement_counts =
        (CASE WHEN jsonb_typeof(achievement_counts) = 'object' THEN achievement_counts ELSE '{}'::jsonb END)
        || (SELECT jsonb_object_agg(k, 1) FROM unnest(v_new) AS k)
  WHERE id = p_user_id;

  RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_achievements(uuid, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_achievements(uuid, text[]) TO service_role;
