import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The Supabase workflow (.github/workflows/supabase-migrations.yml) only
 * watches fe-next/supabase/migrations/**. A migration committed to the
 * repo-root supabase/migrations/ is never applied — PR #936 shipped
 * 20260905140000_assignment_practice_focus.sql there and vocab_focus
 * practice 500'd in prod for a day. The eight files below predate the
 * workflow and were applied by hand; nothing new may join them.
 */
const LEGACY_ROOT_MIGRATIONS = new Set([
  '20260428120000_leaderboard_season_by_date_window.sql',
  '20260428120100_dedupe_leaderboard_to_season_1.sql',
  '20260428120200_leaderboard_avatar_config_sync_and_season_rotate.sql',
  '20260501120000_get_user_tier_position.sql',
  '20260619030000_security_hardening_advisors.sql',
  '20260619040000_perf_policy_consolidation.sql',
  '20260811120000_profiles_read_lockdown_public_view.sql',
  '20260818120000_daily_word_tower_leaderboard.sql',
]);

describe('supabase migrations live where the deploy workflow can see them', () => {
  it('has no new .sql files in the repo-root supabase/migrations/', () => {
    const rootDir = join(__dirname, '..', '..', '..', 'supabase', 'migrations');
    let files: string[] = [];
    try {
      files = readdirSync(rootDir).filter((f) => f.endsWith('.sql'));
    } catch {
      return; // directory gone entirely — even better
    }
    const strays = files.filter((f) => !LEGACY_ROOT_MIGRATIONS.has(f));
    expect(strays, `move these to fe-next/supabase/migrations/: ${strays.join(', ')}`).toEqual([]);
  });
});
