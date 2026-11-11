-- Server-side grants for the rivalry, friends and records achievements.
-- Every grant goes through public.grant_achievements (20261111202030), which only
-- adds keys a player doesn't hold yet, so re-firing is harmless. Each grant is
-- wrapped so a failure warns instead of aborting the friend accept or MP result write.
-- Ladders mirror COUNT_LADDERS in backend/modules/achievements/progressionAchievements.ts.

-- ── Rivalry: wins against any opponent + rematches, from head_to_head ──
-- head_to_head is written only by record_head_to_head_results (service_role), one
-- row per pair with player1_id < player2_id. A trigger covers that writer and any
-- future one without copying its body.
CREATE OR REPLACE FUNCTION public.grant_head_to_head_achievements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player uuid;
  v_wins integer;
BEGIN
  FOREACH v_player IN ARRAY ARRAY[NEW.player1_id, NEW.player2_id] LOOP
    IF (v_player = NEW.player1_id AND COALESCE(NEW.player1_wins, 0) > COALESCE(CASE WHEN TG_OP = 'UPDATE' THEN OLD.player1_wins END, 0))
       OR (v_player = NEW.player2_id AND COALESCE(NEW.player2_wins, 0) > COALESCE(CASE WHEN TG_OP = 'UPDATE' THEN OLD.player2_wins END, 0)) THEN
      SELECT COALESCE(sum(CASE WHEN h.player1_id = v_player THEN h.player1_wins ELSE h.player2_wins END), 0)
        INTO v_wins
      FROM public.head_to_head h
      WHERE h.player1_id = v_player OR h.player2_id = v_player;

      BEGIN
        PERFORM public.grant_achievements(v_player, ARRAY(
        SELECT k FROM (VALUES (1, 'RIVALRY_FIRST_WIN'), (5, 'RIVALRY_5_WINS'), (25, 'RIVALRY_25_WINS')) AS l(n, k)
        WHERE v_wins >= l.n
      ));
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'achievement grant failed: %', SQLERRM;
      END;
    END IF;
  END LOOP;

  -- The same opponent 11 times = 10 rematches.
  IF COALESCE(NEW.total_games, 0) >= 11 THEN
    BEGIN
      PERFORM public.grant_achievements(NEW.player1_id, ARRAY['REMATCH_10']);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'achievement grant failed: %', SQLERRM;
    END;
    BEGIN
      PERFORM public.grant_achievements(NEW.player2_id, ARRAY['REMATCH_10']);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'achievement grant failed: %', SQLERRM;
    END;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS head_to_head_grant_achievements ON public.head_to_head;
CREATE TRIGGER head_to_head_grant_achievements
  AFTER INSERT OR UPDATE OF player1_wins, player2_wins, total_games ON public.head_to_head
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_head_to_head_achievements();

-- ── Friends: accepted friendships, both accept paths ──
-- A request is accepted by the game server (friendsManager) and also by a direct
-- client update (utils/friends.ts), so the grant lives on the table.
CREATE OR REPLACE FUNCTION public.grant_friend_achievements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player uuid;
  v_friends integer;
BEGIN
  IF NEW.status IS DISTINCT FROM 'accepted' THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM 'accepted' THEN
    RETURN NULL;
  END IF;

  FOREACH v_player IN ARRAY ARRAY[NEW.user_id, NEW.friend_id] LOOP
    SELECT count(DISTINCT CASE WHEN f.user_id = v_player THEN f.friend_id ELSE f.user_id END)
      INTO v_friends
    FROM public.friends f
    WHERE f.status = 'accepted' AND (f.user_id = v_player OR f.friend_id = v_player);

    BEGIN
      PERFORM public.grant_achievements(v_player, ARRAY(
      SELECT k FROM (VALUES (1, 'FIRST_FRIEND'), (5, 'FRIENDS_5')) AS l(n, k)
      WHERE v_friends >= l.n
    ));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'achievement grant failed: %', SQLERRM;
    END;
  END LOOP;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS friends_grant_achievements ON public.friends;
CREATE TRIGGER friends_grant_achievements
  AFTER INSERT OR UPDATE OF status ON public.friends
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_friend_achievements();

-- ── Records: count beaten personal bests ──
-- No server table counts records, so RECORD_FIRST's value in achievement_counts is
-- the counter (the profile shows it as "earned Nx"); RECORD_10 lands at 10.
-- Called by the server when it overwrites a previous best (Blast best score,
-- longest word).
CREATE OR REPLACE FUNCTION public.record_personal_best(p_user_id uuid)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_counts jsonb;
  v_had_first boolean;
  v_count integer;
  v_new text[] := ARRAY[]::text[];
BEGIN
  IF p_user_id IS NULL THEN
    RETURN v_new;
  END IF;

  SELECT CASE WHEN jsonb_typeof(achievement_counts) = 'object' THEN achievement_counts ELSE '{}'::jsonb END
    INTO v_counts
  FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN v_new;
  END IF;

  v_had_first := v_counts ? 'RECORD_FIRST';
  v_count := COALESCE((v_counts ->> 'RECORD_FIRST')::integer, 0) + 1;
  v_counts := v_counts || jsonb_build_object('RECORD_FIRST', v_count);
  IF NOT v_had_first THEN
    v_new := v_new || 'RECORD_FIRST';
  END IF;
  IF v_count >= 10 AND NOT (v_counts ? 'RECORD_10') THEN
    v_counts := v_counts || jsonb_build_object('RECORD_10', 1);
    v_new := v_new || 'RECORD_10';
  END IF;

  UPDATE public.profiles SET achievement_counts = v_counts WHERE id = p_user_id;
  RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_head_to_head_achievements() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_friend_achievements() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_personal_best(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_personal_best(uuid) TO service_role;
