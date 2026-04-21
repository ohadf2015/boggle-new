-- Add user-preferred UI/push language to profiles.
-- NULL = unset, fall back to client default on read.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language text
  CHECK (language IN ('he','en','sv','ja','es'));

COMMENT ON COLUMN public.profiles.language IS 'User preferred UI/push language. NULL = use client default.';

CREATE INDEX IF NOT EXISTS idx_profiles_language ON public.profiles(language);
