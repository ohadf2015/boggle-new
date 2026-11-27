/**
 * Guards the deadlock fix for recompute_current_season_leaderboard
 * (2026-10-23: 26% of recomputes failed under one 6-player MP series):
 * the statement-level leaderboard_rank_trigger rewrote rank_position on ALL
 * leaderboard rows after every single-row upsert, so concurrent recomputes
 * locked rows in different orders and deadlocked. Rank is computed at read
 * time by get_leaderboard / get_user_rank / get_user_current_season_rank, so
 * the trigger and its function must stay dropped.
 */
const fs = require('fs');
const path = require('path');

const sql = fs.readFileSync(
  path.join(__dirname, '../20261026130000_drop_leaderboard_rank_trigger.sql'),
  'utf8'
);

describe('drop leaderboard_rank_trigger (deadlock fix)', () => {
  it('drops the statement-level rank trigger', () => {
    expect(sql).toMatch(/DROP TRIGGER IF EXISTS leaderboard_rank_trigger ON public\.leaderboard/i);
  });

  it('drops the rewrite-all-rows rank function', () => {
    expect(sql).toMatch(/DROP FUNCTION IF EXISTS public\.update_leaderboard_ranks\(\)/i);
  });

  it('does not recreate any trigger or rank-maintenance function', () => {
    expect(sql).not.toMatch(/CREATE (OR REPLACE )?TRIGGER/i);
    expect(sql).not.toMatch(/CREATE (OR REPLACE )?FUNCTION public\.update_leaderboard_ranks/i);
  });
});
