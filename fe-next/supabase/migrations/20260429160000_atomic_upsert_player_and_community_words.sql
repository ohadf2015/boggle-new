-- Atomic upsert RPCs to fix lost-update race in
-- savePlayerWord / saveHostApprovedWord. Replaces SELECT-then-UPDATE
-- pattern that under-counted concurrent submissions.

CREATE OR REPLACE FUNCTION public.upsert_player_word(
  p_word text,
  p_language text,
  p_player_id uuid,
  p_game_code text
) RETURNS TABLE(out_id uuid, out_times_submitted integer, out_is_new_word boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.player_words (
    word, language, times_submitted,
    first_submitted_by, first_submitted_in_game,
    last_submitted_by, last_submitted_in_game, last_submitted_at
  )
  VALUES (
    p_word, p_language, 1,
    p_player_id, p_game_code,
    p_player_id, p_game_code, now()
  )
  ON CONFLICT (word, language) DO UPDATE
    SET times_submitted = public.player_words.times_submitted + 1,
        last_submitted_by = EXCLUDED.last_submitted_by,
        last_submitted_in_game = EXCLUDED.last_submitted_in_game,
        last_submitted_at = EXCLUDED.last_submitted_at,
        updated_at = now()
  RETURNING id, times_submitted, (xmax = 0)::boolean;
$$;

REVOKE EXECUTE ON FUNCTION public.upsert_player_word(text, text, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.upsert_player_word(text, text, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.upsert_player_word(text, text, uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_player_word(text, text, uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.upsert_community_word(
  p_word text,
  p_language text,
  p_user_id uuid,
  p_game_code text,
  p_promoted boolean
) RETURNS TABLE(out_id uuid, out_approval_count integer, out_is_new_word boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.community_words (
    word, language, approval_count, promoted_to_dictionary, promoted_at,
    first_approved_by, first_approved_in_game,
    last_approved_by, last_approved_in_game, last_approved_at
  )
  VALUES (
    p_word, p_language, 1,
    p_promoted,
    CASE WHEN p_promoted THEN now() ELSE NULL END,
    p_user_id, p_game_code,
    p_user_id, p_game_code, now()
  )
  ON CONFLICT (word, language) DO UPDATE
    SET approval_count = public.community_words.approval_count + 1,
        promoted_to_dictionary = public.community_words.promoted_to_dictionary OR p_promoted,
        promoted_at = CASE
          WHEN public.community_words.promoted_to_dictionary THEN public.community_words.promoted_at
          WHEN p_promoted THEN now()
          ELSE public.community_words.promoted_at
        END,
        last_approved_by = EXCLUDED.last_approved_by,
        last_approved_in_game = EXCLUDED.last_approved_in_game,
        last_approved_at = EXCLUDED.last_approved_at,
        updated_at = now()
  RETURNING id, approval_count, (xmax = 0)::boolean;
$$;

REVOKE EXECUTE ON FUNCTION public.upsert_community_word(text, text, uuid, text, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.upsert_community_word(text, text, uuid, text, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.upsert_community_word(text, text, uuid, text, boolean) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_community_word(text, text, uuid, text, boolean) TO service_role;

COMMENT ON FUNCTION public.upsert_player_word(text, text, uuid, text) IS
  'Atomic upsert for player_words. Replaces non-atomic SELECT-then-UPDATE pattern. service_role only.';
COMMENT ON FUNCTION public.upsert_community_word(text, text, uuid, text, boolean) IS
  'Atomic upsert for community_words. Promote-once semantics; service_role only.';
