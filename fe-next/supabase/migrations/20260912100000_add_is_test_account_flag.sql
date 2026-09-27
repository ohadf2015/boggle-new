-- QA/automation accounts polluted product metrics (93 of 787 profiles, 14 of 32 classrooms
-- were QA as of 2026-09-12). This flag makes them excludable from metrics and removable
-- with a single predicate instead of a hand-reconstructed pattern match.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_test_account boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_test_account IS
  'True for QA/automation accounts. Auto-set for @lexiclash.test signups and for students who join a test teacher''s classroom. Exclude from all product metrics; safe to bulk-delete.';

-- Partial index: the common query is "exclude test accounts", and true rows are a tiny minority.
CREATE INDEX IF NOT EXISTS idx_profiles_is_test_account
  ON public.profiles (id) WHERE is_test_account;

-- 1) Any account created with the @lexiclash.test convention is a test account.
--    Fires on the profile row that handle_new_user() auto-creates from auth.users.
CREATE OR REPLACE FUNCTION public.flag_test_account_by_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = NEW.id AND u.email ILIKE '%@lexiclash.test'
  ) THEN
    NEW.is_test_account := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_flag_test_account_by_email ON public.profiles;
CREATE TRIGGER trg_flag_test_account_by_email
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.flag_test_account_by_email();

-- 2) Guest students spawned by a QA capture run are anonymous (auth.users.email IS NULL),
--    so email cannot catch them -- they were 64 of the 93 rows purged on 2026-09-12.
--    They are identifiable transitively: they joined a test teacher's classroom.
CREATE OR REPLACE FUNCTION public.flag_test_account_by_classroom()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.student_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.classrooms c
    JOIN public.profiles t ON t.id = c.teacher_id
    WHERE c.id = NEW.classroom_id AND t.is_test_account
  ) THEN
    UPDATE public.profiles SET is_test_account = true
    WHERE id = NEW.student_id AND NOT is_test_account;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_flag_test_account_by_classroom ON public.classroom_memberships;
CREATE TRIGGER trg_flag_test_account_by_classroom
  AFTER INSERT ON public.classroom_memberships
  FOR EACH ROW EXECUTE FUNCTION public.flag_test_account_by_classroom();
