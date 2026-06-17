-- perf: drop unused index idx_offerwall_postbacks_user
--
-- The Supabase performance advisor flagged this index as unused: pg_stat_user_indexes.idx_scan = 0
-- (verified 2026-06-17). It was created 2026-06-05 for potential user_id lookups, but every code
-- path reads public.offerwall_postbacks via the PRIMARY KEY transaction_id — grant_offerwall_coins
-- uses `ON CONFLICT (transaction_id) DO NOTHING`. The index only adds write overhead on every
-- postback insert (a hot webhook path) with zero read benefit.
--
-- Reversible: if user_id lookups are ever needed, re-create with
--   CREATE INDEX IF NOT EXISTS idx_offerwall_postbacks_user ON public.offerwall_postbacks (user_id);
--
-- (Re-landed 2026-06-17 after the original nightly run dropped this file in a gate-wedge
--  docs-only salvage; the gate is now scoped to the changed-cone to prevent recurrence.)

DROP INDEX IF EXISTS public.idx_offerwall_postbacks_user;
