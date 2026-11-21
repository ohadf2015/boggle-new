-- Relay addresses (<hex>@teamchat.zoom.us) made the email prefix a machine id,
-- which then showed as the player's name on public leaderboards. Skip such
-- prefixes at signup (same rule as isPlaceholderName in lib/displayName.ts)
-- and clear the ones already stored.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_oauth_name TEXT;
  v_email_prefix TEXT := split_part(COALESCE(NEW.email, ''), '@', 1);
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
    CASE WHEN v_email_prefix ~* '^[0-9a-f-]{12,}$' AND v_email_prefix ~ '[0-9]' THEN NULL ELSE v_email_prefix END
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

UPDATE public.profiles p
SET display_name = NULL
FROM auth.users u
WHERE u.id = p.id
  AND p.display_name = split_part(u.email, '@', 1)
  AND p.display_name ~* '^[0-9a-f-]{12,}$'
  AND p.display_name ~ '[0-9]';
