-- handle_new_user trigger reads OAuth display name from raw_user_meta_data so
-- Google/Discord/Apple users no longer land on a profile with display_name=NULL
-- and username='Player_<8hex>'. Previous version only set username; client-side
-- createNewProfile() that *does* extract OAuth name was dead code because
-- getProfile() always returned the trigger-created stub before it ran.
--
-- Provider metadata shapes covered:
--   Google / Apple : full_name, name
--   Discord        : custom_claims.global_name, preferred_username, user_name
--   Email/OTP      : email prefix (last resort)
--
-- has_customized_profile is set true only when an OAuth name was found, so the
-- ProfileCustomizationModal still forces a name change for email/OTP signups.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_oauth_name TEXT;
  v_meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
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
    id, username, display_name, avatar_emoji, avatar_color, has_customized_profile
  )
  VALUES (
    NEW.id,
    COALESCE(v_meta->>'username', 'Player_' || substr(NEW.id::text, 1, 8)),
    v_oauth_name,
    COALESCE(v_meta->>'avatar_emoji', '😊'),
    COALESCE(v_meta->>'avatar_color', '#4F46E5'),
    v_oauth_name IS NOT NULL
  );
  RETURN NEW;
END;
$function$;
