-- daily_retry_tokens existed in production with no migration in the repo. This records its schema
-- (idempotent, matches prod as of 2026-10-30) and closes the read policy: it ended in `OR true`, so
-- anyone could list every live token and use it as a free "replay today" link. Tokens are read only
-- by service-role routes (admin generate-retry-link, /api/daily/validate-retry-token).

CREATE TABLE IF NOT EXISTS public.daily_retry_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  puzzle_date date NOT NULL,
  language character varying NOT NULL,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  use_count integer DEFAULT 0
);

ALTER TABLE public.daily_retry_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_daily_retry_tokens_select_public ON public.daily_retry_tokens;
CREATE POLICY rls_daily_retry_tokens_select_public ON public.daily_retry_tokens
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true)
  );

CREATE OR REPLACE FUNCTION public.increment_retry_token_use_count(token_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE daily_retry_tokens
  SET use_count = use_count + 1
  WHERE id = token_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.increment_retry_token_use_count(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_retry_token_use_count(uuid) TO service_role;
