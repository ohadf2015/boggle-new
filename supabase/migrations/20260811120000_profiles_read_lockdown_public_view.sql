-- F-002: stop anonymous read of profiles PII + add public_profiles view
-- 1. Curated SECURITY DEFINER view (default) exposing only leaderboard-safe
--    columns. NOTE: intentionally NOT security_invoker=on — with invoker
--    security the self-read RLS policy on profiles would make the view return
--    zero rows to anonymous callers, defeating its purpose (public
--    leaderboard / friends / pacts). The view owner (postgres) bypasses RLS;
--    safety comes from the tight column allowlist (no display_name, no email
--    token, no UTM/referrer, no birth_year, no coins, no ban/admin flags).
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id,
  username,
  avatar_emoji,
  avatar_color,
  avatar_image,
  avatar_config,
  player_title,
  current_level,
  prestige_level,
  total_games,
  total_score,
  total_words,
  casual_wins,
  ranked_games,
  ranked_wins,
  ranked_mmr,
  peak_mmr,
  longest_word,
  longest_word_length,
  unique_days_played
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 2. Replace the wide-open read policy with self-read only.
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

-- 3. Rotate every issued email_unsubscribe_token (exposed via the anon-read
--    hole since launch — treat as compromised). NULL tokens are left NULL;
--    the email pipeline generates one on first send.
UPDATE public.profiles
SET email_unsubscribe_token = encode(gen_random_bytes(32), 'hex')
WHERE email_unsubscribe_token IS NOT NULL;
