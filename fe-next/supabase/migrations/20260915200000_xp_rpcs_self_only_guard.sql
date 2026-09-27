-- XP RPCs: an authenticated caller may only award XP / prestige to THEMSELVES.
--
-- increment_player_xp, award_education_xp and apply_prestige are SECURITY DEFINER,
-- EXECUTE-granted to `authenticated`, and never looked at the caller. Any logged-in
-- user could run, from the browser:
--   supabase.rpc('increment_player_xp', { p_player_id: <anyone>, p_xp_amount: 1e6 })
-- (verified 2026-09-15: user 1111… successfully called it for player 2222…).
--
-- A plain REVOKE would break the Next routes that call these with the user's own
-- session (record-xp, record-game, practice PATCH, prestige). So instead:
--   auth.uid() IS NULL      → service_role / backend / pg_cron → allowed (unchanged)
--   auth.uid() = target     → user awarding themselves → allowed (daily cap still applies)
--   auth.uid() <> target    → rejected with 42501
-- increment_profile_xp forwards to increment_player_xp, so it inherits the guard.

CREATE OR REPLACE FUNCTION public.assert_xp_target_is_caller(p_target uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_target THEN
    RAISE EXCEPTION 'XP can only be awarded to the calling user' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_xp_target_is_caller(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assert_xp_target_is_caller(uuid) TO authenticated, service_role;

-- increment_player_xp: body is long (prestige multiplier + diminishing returns + daily
-- cap); keep it verbatim under a private name and put a guarded wrapper in front.
-- Idempotent: CI for migrations is dead, this file gets applied by hand (maybe twice).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'increment_player_xp_unchecked'
  ) THEN
    ALTER FUNCTION public.increment_player_xp(uuid, integer) RENAME TO increment_player_xp_unchecked;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.increment_player_xp_unchecked(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_player_xp_unchecked(uuid, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.increment_player_xp(p_player_id uuid, p_xp_amount integer)
RETURNS TABLE(new_total_xp bigint, new_lifetime_xp bigint, new_level integer, xp_granted integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.assert_xp_target_is_caller(p_player_id);
  RETURN QUERY SELECT * FROM public.increment_player_xp_unchecked(p_player_id, p_xp_amount);
END;
$$;

REVOKE ALL ON FUNCTION public.increment_player_xp(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_player_xp(uuid, integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.award_education_xp(p_student_id uuid, p_xp_amount integer, p_lesson_id uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.assert_xp_target_is_caller(p_student_id);

  IF p_lesson_id IS NOT NULL THEN
    INSERT INTO student_lesson_progress (
      student_id,
      lesson_id,
      total_xp,
      total_practice_sessions,
      last_practice_date
    )
    VALUES (
      p_student_id,
      p_lesson_id,
      p_xp_amount,
      1,
      CURRENT_DATE
    )
    ON CONFLICT (student_id, lesson_id) DO UPDATE
    SET
      total_xp = student_lesson_progress.total_xp + p_xp_amount,
      total_practice_sessions = student_lesson_progress.total_practice_sessions + 1,
      last_practice_date = CURRENT_DATE;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_prestige(p_player_id uuid, p_expected_prestige integer)
RETURNS TABLE(new_prestige_level integer, new_multiplier numeric, new_title text, rows_affected integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_prestige INTEGER;
  v_new_multiplier NUMERIC(4,2);
  v_new_title TEXT;
  v_rows INTEGER;
  v_multipliers NUMERIC(4,2)[] := ARRAY[1.00, 1.05, 1.10, 1.15, 1.20, 1.25];
  v_titles TEXT[] := ARRAY[NULL, 'ASCENDED_ONE', 'TWICE_RISEN', 'THRICE_BLESSED', 'ETERNAL_WARRIOR', 'LEXICON_IMMORTAL'];
BEGIN
  PERFORM public.assert_xp_target_is_caller(p_player_id);

  v_new_prestige := p_expected_prestige + 1;

  IF v_new_prestige > 5 THEN
    RETURN QUERY SELECT 0, 1.00::NUMERIC(4,2), NULL::TEXT, 0;
    RETURN;
  END IF;

  v_new_multiplier := v_multipliers[v_new_prestige + 1]; -- 1-indexed
  v_new_title := v_titles[v_new_prestige + 1];

  -- Atomic update with optimistic lock on prestige_level
  -- lifetime_xp is NOT modified — increment_player_xp already tracks it cumulatively
  UPDATE profiles
  SET current_level = 1,
      total_xp = 0,
      prestige_level = v_new_prestige,
      prestige_multiplier = v_new_multiplier,
      player_title = v_new_title,
      updated_at = NOW()
  WHERE id = p_player_id
    AND COALESCE(prestige_level, 0) = p_expected_prestige
    AND COALESCE(current_level, 1) >= 100;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  RETURN QUERY SELECT v_new_prestige, v_new_multiplier, v_new_title, v_rows;
END;
$$;
