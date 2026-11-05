-- Email signup attribution + teacher intent (t_9eb9ad5f)
--
-- Email confirm links open in another browser, so localStorage first-touch
-- never arrives. signUpWithEmail now stashes signup_surface, language,
-- country_code and intended_role in options.data (raw_user_meta_data).
-- This trigger stamps them at insert, including on accounts that never
-- confirm — that is what the 90% non-null surface/landing grade measures.
-- The Growth Radar event is NOT emitted here. It fires once, on the first
-- authenticated session, from POST /api/auth/attribution.
--
-- confirmed_email_domains is the typo-hint dictionary (studnets → students).
-- Service role only: the hint route returns at most one nearby domain, never
-- the list.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_oauth_name TEXT;
  v_meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_utm_source TEXT := left(NULLIF(TRIM(v_meta->>'utm_source'), ''), 200);
  v_utm_medium TEXT := left(NULLIF(TRIM(v_meta->>'utm_medium'), ''), 200);
  v_utm_campaign TEXT := left(NULLIF(TRIM(v_meta->>'utm_campaign'), ''), 200);
  v_referrer TEXT := left(NULLIF(TRIM(v_meta->>'referrer_domain'), ''), 200);
  v_landing_path TEXT := left(NULLIF(TRIM(v_meta->>'landing_path'), ''), 500);
  v_signup_surface TEXT := left(NULLIF(TRIM(v_meta->>'signup_surface'), ''), 100);
  v_language TEXT := NULLIF(lower(left(TRIM(COALESCE(v_meta->>'language', '')), 8)), '');
  v_country TEXT := upper(left(NULLIF(TRIM(v_meta->>'country_code'), ''), 2));
  v_role public.user_role := CASE
    WHEN v_meta->>'intended_role' = 'teacher' THEN 'teacher'::public.user_role
    ELSE 'student'::public.user_role
  END;
BEGIN
  IF v_language IS NOT NULL AND v_language NOT IN ('he', 'en', 'sv', 'ja', 'es', 'ru') THEN
    v_language := NULL;
  END IF;
  IF v_country IS NOT NULL AND v_country !~ '^[A-Z]{2}$' THEN
    v_country := NULL;
  END IF;
  IF v_country IN ('XX', 'T1') THEN
    v_country := NULL;
  END IF;

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
    utm_source, utm_medium, utm_campaign, referrer, landing_path, signup_surface,
    language, country_code, user_role
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
    v_landing_path,
    v_signup_surface,
    v_language,
    v_country,
    v_role
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.confirmed_email_domains(p_limit int DEFAULT 400)
RETURNS TABLE(domain text, n bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
  SELECT lower(split_part(email, '@', 2)) AS domain, count(*) AS n
  FROM auth.users
  WHERE email_confirmed_at IS NOT NULL
    AND email IS NOT NULL
    AND position('@' IN email) > 1
  GROUP BY 1
  ORDER BY n DESC, 1
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 400), 1000));
$function$;

REVOKE ALL ON FUNCTION public.confirmed_email_domains(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirmed_email_domains(int) TO service_role;
