-- Daily streak rewards: milestone coin claims, and buying a streak freeze for coins.

-- One row per player per milestone; the primary key is the double-pay guard.
-- Service-role only (RLS on, no policies); not part of supabase_realtime.
CREATE TABLE IF NOT EXISTS public.daily_streak_milestone_claims (
  player_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  milestone  integer     NOT NULL CHECK (milestone IN (3, 7, 14, 30, 60, 100)),
  coins      integer     NOT NULL CHECK (coins > 0),
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, milestone)
);

ALTER TABLE public.daily_streak_milestone_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.daily_streak_milestone_claims FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.daily_streak_milestone_claims TO service_role;

-- The login trigger ran its streak logic on EVERY update, so a freeze grant on a
-- day the player had not logged in replaced the +1 with OLD - 1. An update that
-- only touches the freeze pool is not a login.
CREATE OR REPLACE FUNCTION public.update_player_engagement_on_login()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    today DATE := CURRENT_DATE;
    yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
BEGIN
    IF NEW.streak_freezes_available IS DISTINCT FROM OLD.streak_freezes_available
       AND NEW.last_login_date IS NOT DISTINCT FROM OLD.last_login_date THEN
        RETURN NEW;
    END IF;

    IF OLD.last_login_date IS NULL OR OLD.last_login_date < today THEN
        IF OLD.last_login_date = yesterday OR OLD.streak_protected_until >= today THEN
            NEW.current_streak := OLD.current_streak + 1;
        ELSIF OLD.last_login_date < yesterday AND OLD.streak_freezes_available > 0 THEN
            NEW.current_streak := OLD.current_streak + 1;
            NEW.streak_freezes_available := OLD.streak_freezes_available - 1;
        ELSE
            NEW.current_streak := 1;
        END IF;

        IF NEW.current_streak > COALESCE(OLD.longest_streak, 0) THEN
            NEW.longest_streak := NEW.current_streak;
        END IF;

        NEW.last_login_date := today;
        NEW.games_today := 0;
    END IF;
    RETURN NEW;
END;
$function$;

-- Spend coins and add one freeze in one transaction, refusing past p_max held.
CREATE OR REPLACE FUNCTION public.buy_streak_freeze(p_user_id uuid, p_price integer, p_max integer)
RETURNS TABLE(success boolean, freezes integer, new_balance integer, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owned   integer;
  v_balance integer;
BEGIN
  IF p_price IS NULL OR p_price <= 0 OR p_max IS NULL OR p_max <= 0 THEN
    RETURN QUERY SELECT FALSE, 0, 0, 'invalid_arguments'::text;
    RETURN;
  END IF;

  INSERT INTO public.player_engagement (player_id, streak_freezes_available)
  VALUES (p_user_id, 0)
  ON CONFLICT (player_id) DO NOTHING;

  SELECT COALESCE(pe.streak_freezes_available, 0) INTO v_owned
  FROM public.player_engagement pe
  WHERE pe.player_id = p_user_id
  FOR UPDATE;

  SELECT COALESCE(p.total_coins, 0) INTO v_balance FROM public.profiles p WHERE p.id = p_user_id;

  IF v_owned >= p_max THEN
    RETURN QUERY SELECT FALSE, v_owned, COALESCE(v_balance, 0), 'max_held'::text;
    RETURN;
  END IF;

  UPDATE public.profiles p
  SET total_coins = COALESCE(p.total_coins, 0) - p_price,
      updated_at  = now()
  WHERE p.id = p_user_id
    AND COALESCE(p.total_coins, 0) >= p_price
  RETURNING p.total_coins INTO v_balance;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, v_owned, COALESCE(v_balance, 0), 'insufficient_coins'::text;
    RETURN;
  END IF;

  UPDATE public.player_engagement pe
  SET streak_freezes_available = v_owned + 1
  WHERE pe.player_id = p_user_id;

  RETURN QUERY SELECT TRUE, v_owned + 1, v_balance, NULL::text;
END;
$$;

REVOKE ALL ON FUNCTION public.buy_streak_freeze(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.buy_streak_freeze(uuid, integer, integer) TO service_role;
