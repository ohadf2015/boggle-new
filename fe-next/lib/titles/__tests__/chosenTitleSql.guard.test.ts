import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LEVEL_TITLES, PRESTIGE_CONFIG } from '@/backend/modules/xpManager';
import { ACHIEVEMENT_TITLE_REWARDS } from '@/backend/modules/achievements/progressionAchievements';

const sql = readFileSync(
  join(process.cwd(), 'supabase/migrations/20261111202100_profiles_chosen_title.sql'),
  'utf8',
);

describe('chosen_title trigger matches the TS title lists', () => {
  it('every level title is gated at its level', () => {
    for (const [lvl, id] of Object.entries(LEVEL_TITLES)) {
      if (id) expect(sql).toContain(`WHEN '${id}' THEN v_level >= ${lvl}`);
    }
  });
  it('every prestige title is gated at its prestige', () => {
    for (const [p, id] of Object.entries(PRESTIGE_CONFIG.TITLES)) {
      expect(sql).toContain(`WHEN '${id}' THEN v_prestige >= ${p}`);
    }
  });
  it('every achievement title is gated on its achievement', () => {
    for (const [ach, id] of Object.entries(ACHIEVEMENT_TITLE_REWARDS)) {
      expect(sql).toContain(`WHEN '${id}' THEN v_counts ? '${ach}'`);
    }
  });
});
