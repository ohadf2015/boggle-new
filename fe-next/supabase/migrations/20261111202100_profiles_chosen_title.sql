-- A title the player picks to show on their profile, rival card and leaderboards.
--
-- Separate from player_title on purpose: the XP paths (record-game, MP stats,
-- adventure, prestige RPCs) rewrite player_title on every title-granting level-up,
-- which would wipe a pick. Display = chosen_title, else the level-derived title.
-- profiles is client-writable for the owner, so a trigger rejects titles the
-- player has not unlocked (level ladder, prestige, achievement rewards), and the
-- first pick grants TITLE_PICKED. Keep the
-- lists in sync with backend/modules/xpManager.ts LEVEL_TITLES / PRESTIGE_CONFIG
-- and backend/modules/achievements/progressionAchievements.ts ACHIEVEMENT_TITLE_REWARDS.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS chosen_title text;

CREATE OR REPLACE FUNCTION public.enforce_chosen_title_unlocked()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_level integer := COALESCE(NEW.current_level, 1);
  v_prestige integer := COALESCE(NEW.prestige_level, 0);
  v_counts jsonb := CASE WHEN jsonb_typeof(NEW.achievement_counts) = 'object' THEN NEW.achievement_counts ELSE '{}'::jsonb END;
  v_ok boolean;
BEGIN
  IF NEW.chosen_title IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.chosen_title IS NOT DISTINCT FROM OLD.chosen_title THEN
    RETURN NEW;
  END IF;

  v_ok := CASE NEW.chosen_title
    WHEN 'WORD_SEEKER' THEN v_level >= 5
    WHEN 'LETTER_SCOUT' THEN v_level >= 10
    WHEN 'VOCAB_WARRIOR' THEN v_level >= 15
    WHEN 'WORD_KNIGHT' THEN v_level >= 20
    WHEN 'LEXICAL_MASTER' THEN v_level >= 25
    WHEN 'DICTIONARY_LORD' THEN v_level >= 35
    WHEN 'WORD_LEGEND' THEN v_level >= 50
    WHEN 'LEXICON_KING' THEN v_level >= 75
    WHEN 'GRANDMASTER' THEN v_level >= 90
    WHEN 'ETERNAL_CHAMPION' THEN v_level >= 100
    WHEN 'ASCENDED_ONE' THEN v_prestige >= 1
    WHEN 'TWICE_RISEN' THEN v_prestige >= 2
    WHEN 'THRICE_BLESSED' THEN v_prestige >= 3
    WHEN 'ETERNAL_WARRIOR' THEN v_prestige >= 4
    WHEN 'LEXICON_IMMORTAL' THEN v_prestige >= 5
    WHEN 'NEMESIS' THEN v_counts ? 'RIVALRY_25_WINS'
    WHEN 'RECORD_BREAKER' THEN v_counts ? 'RECORD_10'
    WHEN 'SOCIAL_BUTTERFLY' THEN v_counts ? 'FRIENDS_5'
    WHEN 'DAILY_REGULAR' THEN v_counts ? 'DAILY_BOARD_STREAK_30'
    ELSE false
  END;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'title % is not unlocked', NEW.chosen_title USING ERRCODE = '42501';
  END IF;
  -- First pick grants the TITLE_PICKED achievement.
  IF NOT (v_counts ? 'TITLE_PICKED') THEN
    NEW.achievement_counts := v_counts || jsonb_build_object('TITLE_PICKED', 1);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_chosen_title_unlocked ON public.profiles;
CREATE TRIGGER profiles_chosen_title_unlocked
  BEFORE INSERT OR UPDATE OF chosen_title ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_chosen_title_unlocked();
