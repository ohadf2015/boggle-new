-- Party Games Alpha Feature Flag
-- Gated to admin-only, 0% rollout. Admin grants access to selected testers.

INSERT INTO feature_flags (flag_name, enabled, admin_only, rollout_percentage)
VALUES ('party_games_alpha', true, true, 0)
ON CONFLICT (flag_name) DO UPDATE SET admin_only = true, rollout_percentage = 0;
