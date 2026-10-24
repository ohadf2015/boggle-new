import { describe, it, expect } from 'vitest';
import { CLASSROOM_BOSS_IDS } from '@/shared/types/classroomBoss';
import { nextBossId } from '../nextBossId';

describe('nextBossId', () => {
  it('moves to the boss after the last one fought', () => {
    expect(nextBossId('lexiconDragon')).toBe('msGrammar');
  });

  it('wraps from the last boss to the first', () => {
    expect(nextBossId(CLASSROOM_BOSS_IDS[CLASSROOM_BOSS_IDS.length - 1])).toBe(CLASSROOM_BOSS_IDS[0]);
  });

  it('never repeats the last boss, whatever the roll', () => {
    for (const last of CLASSROOM_BOSS_IDS) expect(nextBossId(last)).not.toBe(last);
  });

  it('with no history or garbage history, picks a valid boss from the roll', () => {
    expect(CLASSROOM_BOSS_IDS).toContain(nextBossId(null, () => 0.99));
    expect(nextBossId('notABoss', () => 0)).toBe(CLASSROOM_BOSS_IDS[0]);
  });
});
