import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { COUNT_LADDERS } from '@/backend/modules/achievements/progressionAchievements';

const sql = readFileSync(
  join(process.cwd(), 'supabase/migrations/20261111202031_progression_achievement_grants.sql'),
  'utf8',
);

describe('SQL achievement grants match COUNT_LADDERS', () => {
  it.each([['rivalWins'], ['friends']] as const)('%s ladder rungs appear in the trigger', (name) => {
    for (const [n, key] of COUNT_LADDERS[name]) expect(sql).toContain(`(${n}, '${key}')`);
  });
  it('records ladder: RECORD_FIRST counts, RECORD_10 at 10', () => {
    const [[, first], [ten, tenKey]] = COUNT_LADDERS.records;
    expect(sql).toContain(`'${first}'`);
    expect(sql).toContain(`v_count >= ${ten} AND NOT (v_counts ? '${tenKey}')`);
  });
  it('rematch ladder: 10 rematches = 11 games against one opponent', () => {
    const [[n, key]] = COUNT_LADDERS.rematches;
    expect(sql).toContain(`total_games, 0) >= ${n + 1}`);
    expect(sql).toContain(`ARRAY['${key}']`);
  });
});
