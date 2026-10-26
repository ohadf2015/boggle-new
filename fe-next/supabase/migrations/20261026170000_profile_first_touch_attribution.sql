-- =============================================
-- First-touch attribution on profiles (t_a80f937b)
-- Migration: 20261026170000_profile_first_touch_attribution
--
-- profiles.utm_source / utm_medium / utm_campaign / referrer existed since
-- migration 010 but were NEVER written: 0 of 1,011 profiles created since
-- 2026-05 carry any attribution, and ~37% of real accounts are invisible to
-- consent-gated analytics, so every channel/SEO/signup-surface decision runs
-- on a biased ~63% sample.
--
-- Changes:
-- 1. Add nullable landing_path + signup_surface columns (no backfill).
-- 2. handle_new_user() now also reads attribution keys from
--    raw_user_meta_data — the email-signup path passes them via
--    signUp({ options: { data } }) so a confirm-link opened in a DIFFERENT
--    browser (no localStorage) still lands with attribution. The OAuth path
--    is covered by POST /api/auth/attribution after the callback.
-- Both writers only fill NULL columns, so they never clobber each other.
-- =============================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS landing_path TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signup_surface TEXT;

COMMENT ON COLUMN public.profiles.landing_path IS 'First-touch landing path (pathname + utm_* params only), captured client-side at first pageview (t_a80f937b).';
COMMENT ON COLUMN public.profiles.signup_surface IS 'Signup surface that produced the account, same value as growth:signup_completed.source (header_or_menu / results_inline / edu_access / first_win_prompt / multi_game_prompt / unknown) (t_a80f937b).';

CREATE INDEX IF NOT EXISTS idx_profiles_signup_surface ON profiles(signup_surface) WHERE signup_surface IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_referrer ON profiles(referrer) WHERE referrer IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_oauth_name TEXT;
  v_meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  -- Attribution keys passed by signUpWithEmail via options.data
  -- (utils/utmCapture.ts first-touch record). NULLIF+left() keep them
  -- clean and bounded.
  v_utm_source TEXT := left(NULLIF(TRIM(v_meta->>'utm_source'), ''), 200);
  v_utm_medium TEXT := left(NULLIF(TRIM(v_meta->>'utm_medium'), ''), 200);
  v_utm_campaign TEXT := left(NULLIF(TRIM(v_meta->>'utm_campaign'), ''), 200);
  v_referrer TEXT := left(NULLIF(TRIM(v_meta->>'referrer_domain'), ''), 200);
  v_landing_path TEXT := left(NULLIF(TRIM(v_meta->>'landing_path'), ''), 500);
BEGIN
  v_oauth_name := NULLIF(TRIM(COALESCE(
    v_meta->>'full_name',
    v_meta->>'name',
    v_meta->'custom_claims'->>'global_name',
    v_meta->>'preferred_username',
    v_meta->>'user_name',
    split_part(NEW.email, '@', 1)
  )), '');

  INSERT INTO public.profiles (
    id, username, display_name, avatar_emoji, avatar_color, has_customized_profile,
    utm_source, utm_medium, utm_campaign, referrer, landing_path
  )
  VALUES (
    NEW.id,
    COALESCE(v_meta->>'username', 'Player_' || substr(NEW.id::text, 1, 8)),
    v_oauth_name,
    COALESCE(v_meta->>'avatar_emoji', '😊'),
    COALESCE(v_meta->>'avatar_color', '#4F46E5'),
    v_oauth_name IS NOT NULL,
    v_utm_source,
    v_utm_medium,
    v_utm_campaign,
    v_referrer,
    v_landing_path
  );
  RETURN NEW;
END;
$function$;
