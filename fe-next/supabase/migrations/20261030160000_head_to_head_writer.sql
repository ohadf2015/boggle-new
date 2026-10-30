-- Server-side writer for head_to_head: one atomic batched increment per MP round.
-- Writes come only from the game server (service_role); players lose direct write access.

DROP POLICY IF EXISTS "Authenticated users can insert h2h records" ON public.head_to_head;
DROP POLICY IF EXISTS "Authenticated users can update h2h records" ON public.head_to_head;

CREATE OR REPLACE FUNCTION public.record_head_to_head_results(p_pairs jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rows integer;
BEGIN
  WITH input AS (
    SELECT DISTINCT ON (x.player1_id, x.player2_id) x.*
    FROM jsonb_to_recordset(COALESCE(p_pairs, '[]'::jsonb)) AS x(
      player1_id uuid, player2_id uuid,
      player1_wins integer, player2_wins integer, draws integer,
      player1_score integer, player2_score integer
    )
    WHERE x.player1_id < x.player2_id
  ),
  eligible AS (
    SELECT i.*
    FROM input i
    JOIN public.profiles p1 ON p1.id = i.player1_id AND NOT COALESCE(p1.is_test_account, false)
    JOIN public.profiles p2 ON p2.id = i.player2_id AND NOT COALESCE(p2.is_test_account, false)
  ),
  upserted AS (
    INSERT INTO public.head_to_head AS h (
      player1_id, player2_id, player1_wins, player2_wins, draws, total_games,
      player1_total_score, player2_total_score, last_game_at, updated_at
    )
    SELECT player1_id, player2_id,
           COALESCE(player1_wins, 0), COALESCE(player2_wins, 0), COALESCE(draws, 0), 1,
           COALESCE(player1_score, 0), COALESCE(player2_score, 0), now(), now()
    FROM eligible
    ON CONFLICT (player1_id, player2_id) DO UPDATE SET
      player1_wins = COALESCE(h.player1_wins, 0) + EXCLUDED.player1_wins,
      player2_wins = COALESCE(h.player2_wins, 0) + EXCLUDED.player2_wins,
      draws = COALESCE(h.draws, 0) + EXCLUDED.draws,
      total_games = COALESCE(h.total_games, 0) + 1,
      player1_total_score = COALESCE(h.player1_total_score, 0) + EXCLUDED.player1_total_score,
      player2_total_score = COALESCE(h.player2_total_score, 0) + EXCLUDED.player2_total_score,
      last_game_at = now(),
      updated_at = now()
    RETURNING 1
  )
  SELECT count(*) INTO v_rows FROM upserted;
  RETURN v_rows;
END;
$$;

REVOKE ALL ON FUNCTION public.record_head_to_head_results(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_head_to_head_results(jsonb) TO service_role;
