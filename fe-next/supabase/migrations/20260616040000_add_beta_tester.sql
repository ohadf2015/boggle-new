-- Beta testers: admin-granted flag that unlocks in-work game modes (those still
-- gated behind is_admin) for trusted players ahead of public release.
--
-- Mirrors blast_access exactly: additive boolean, default false, no realtime
-- consumer (admin reads it via the players API; clients read their own row in
-- the profile fetch). Access is decided by lib/auth/inWorkModeAccess.ts:
--   canAccessInWorkMode(profile) = is_admin OR is_beta_tester
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_beta_tester boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_beta_tester IS
  'Admin-granted: unlocks in-work/preview game modes (see lib/auth/inWorkModeAccess.ts). Mirrors blast_access.';
