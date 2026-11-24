-- Disposable schema for scripts/verify-teacher-funnel.mjs.
-- Just the tables the teacher trial→paid journey reads and writes.
-- RLS matches production closely enough that a service-role vs cookie-client
-- mixup fails the HTTP proof instead of passing against an open table.

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY,
  email text
);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE plpgsql STABLE AS $$
DECLARE claims text;
BEGIN
  claims := current_setting('request.jwt.claims', true);
  IF claims IS NULL OR claims = '' THEN RETURN NULL; END IF;
  RETURN NULLIF(claims::json->>'sub', '')::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text,
  country_code text,
  user_role text NOT NULL DEFAULT 'student',
  is_admin boolean NOT NULL DEFAULT false,
  is_test_account boolean NOT NULL DEFAULT false,
  utm_medium text
);

CREATE OR REPLACE FUNCTION public.is_admin_user() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND COALESCE(is_admin, false)
  );
$$;

CREATE TABLE IF NOT EXISTS public.teacher_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  school_or_org text,
  country text,
  role text NOT NULL CHECK (role IN ('teacher','tutor','admin','parent','researcher','other')),
  locale text NOT NULL DEFAULT 'en' CHECK (locale IN ('en','he','sv','ja','es','ru')),
  use_case text NOT NULL CHECK (length(use_case) <= 800),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','declined')),
  admin_note text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  trial_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'paused', 'trialing')),
  lemon_squeezy_subscription_id text,
  lemon_squeezy_order_id text,
  lemon_squeezy_variant_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  source text,
  grant_id uuid,
  provider_event_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  subscription_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Empty stubs so the 30-day readout SQL runs unmodified.
CREATE TABLE IF NOT EXISTS public.classrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.lesson_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.classroom_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid,
  student_id uuid,
  joined_at timestamptz,
  is_rehearsal boolean NOT NULL DEFAULT false
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin_user());
CREATE POLICY tar_insert_any ON public.teacher_access_requests FOR INSERT WITH CHECK (true);
CREATE POLICY tar_select_own ON public.teacher_access_requests FOR SELECT USING (auth.uid() = user_id OR public.is_admin_user());
CREATE POLICY tar_admin_update ON public.teacher_access_requests FOR UPDATE USING (public.is_admin_user());
CREATE POLICY sub_select_own ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY events_select_own ON public.subscription_events FOR SELECT USING (auth.uid() = user_id);

DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role NOLOGIN BYPASSRLS; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'funnel-auth'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT anon, authenticated, service_role TO authenticator;
ALTER ROLE service_role BYPASSRLS;

GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles, public.teacher_access_requests, public.subscriptions, public.subscription_events TO authenticated;
GRANT SELECT, INSERT ON public.teacher_access_requests TO anon;
GRANT SELECT ON public.profiles TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO anon, authenticated, service_role;
