-- Seed the party_games_alpha feature flag (admin-only host/create gate).
--
-- Why this exists: backend/utils/featureFlags.ts canAccessFeature() short-circuits
-- `if (!flag) return false` BEFORE the admin bypass. A MISSING flag row therefore
-- denies everyone — including admins — so admins could not access/host party games.
-- enabled=true + admin_only=true => admins pass the create gate; the public is blocked.
-- Joining a room is gated by possession of a valid room code (see partyHandler.ts
-- party:join), not by this flag, so invited non-admin players can join an admin's
-- playtest room.
--
-- Idempotent: safe to re-run; updates config if the row already exists.
INSERT INTO public.feature_flags (flag_name, enabled, admin_only, rollout_percentage, description)
VALUES (
  'party_games_alpha',
  true,
  true,
  0,
  'Party games (Caption/Pixel/Shadow Clash) — admin-only host/create gate; join is open by room code.'
)
ON CONFLICT (flag_name) DO UPDATE
  SET enabled = EXCLUDED.enabled,
      admin_only = EXCLUDED.admin_only,
      rollout_percentage = EXCLUDED.rollout_percentage,
      description = EXCLUDED.description,
      updated_at = now();
