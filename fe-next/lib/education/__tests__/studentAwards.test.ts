import { describe, expect, it } from 'vitest';
import { planAwardGrant, SERVER_AWARD_KEYS, serverAwardValues } from '../studentAwards';
import { isEarnableAward } from '@/app/[locale]/student/achievements/awardsSummary';

const STUDENT = 'student-1';
const NOW = '2026-11-21T10:00:00.000Z';
const IDS = new Map(SERVER_AWARD_KEYS.map((key) => [key, `id-${key}`]));

const plan = (values: Record<string, number>, stored = new Map<string, 'bronze' | 'silver' | 'gold' | 'platinum'>(), ids: Map<string, string> = IDS) =>
  planAwardGrant({ studentId: STUDENT, values, stored, definitionIds: ids, nowIso: NOW });

describe('serverAwardValues', () => {
  it('GIVEN lesson XP rows WHEN summed THEN XP, sessions, practiced lessons and the best lesson level come from them', () => {
    const values = serverAwardValues([
      { lesson_id: 'a', total_xp: 400, total_practice_sessions: 3 },
      { lesson_id: 'b', total_xp: 0, total_practice_sessions: 0 },
      { lesson_id: 'c', total_xp: 100, total_practice_sessions: 1 },
    ]);
    expect(values).toMatchObject({ xp_collector: 500, practice_veteran: 4, first_lesson: 2, lesson_collector: 2 });
    expect(values.level_climber).toBeGreaterThanOrEqual(1);
  });

  it('GIVEN the XP this completion just earned WHEN folded in THEN it counts as one more session on that lesson', () => {
    const values = serverAwardValues([], { lessonId: 'new', xp: 80 });
    expect(values).toMatchObject({ xp_collector: 80, practice_veteran: 1, first_lesson: 1, lesson_collector: 1 });
  });

  it('GIVEN null columns WHEN summed THEN they count as zero', () => {
    expect(serverAwardValues([{ lesson_id: 'a', total_xp: null, total_practice_sessions: null }]))
      .toMatchObject({ xp_collector: 0, practice_veteran: 0, first_lesson: 0 });
  });
});

describe('planAwardGrant', () => {
  it('GIVEN a first practiced lesson WHEN planned THEN first_lesson bronze is written by achievement_id and announced as new', () => {
    const { achievementRows, unlocks } = plan({ first_lesson: 1 });
    expect(achievementRows).toEqual([
      { student_id: STUDENT, achievement_id: 'id-first_lesson', current_tier: 'bronze', progress_value: 1, last_tier_unlock: NOW },
    ]);
    expect(unlocks).toEqual([{ achievementKey: 'first_lesson', tier: 'bronze', icon: '📚', isNew: true, isUpgrade: false }]);
  });

  it('GIVEN values one below and exactly at a threshold WHEN planned THEN only the exact one reaches the tier', () => {
    expect(plan({ xp_collector: 499 }).unlocks).toEqual([]);
    expect(plan({ xp_collector: 500 }).unlocks.map((u) => u.tier)).toEqual(['bronze']);
    expect(plan({ xp_collector: 1999 }, new Map([['xp_collector', 'bronze']])).unlocks).toEqual([]);
    expect(plan({ xp_collector: 2000 }, new Map([['xp_collector', 'bronze']])).unlocks)
      .toEqual([{ achievementKey: 'xp_collector', tier: 'silver', icon: '💎', isNew: false, isUpgrade: true }]);
  });

  it('GIVEN a stored tier above what the values reach WHEN planned THEN nothing is written that lowers it', () => {
    const { achievementRows, unlocks, progressRows } = plan({ practice_veteran: 12 }, new Map([['practice_veteran', 'gold']]));
    expect(achievementRows).toEqual([]);
    expect(unlocks).toEqual([]);
    const row = progressRows.find((r) => r.achievement_key === 'practice_veteran');
    expect(row?.current_count).toBe(200);
    expect(row?.tier).toBe('platinum');
  });

  it('GIVEN the stored tier already matches WHEN planned THEN no unlock is announced again', () => {
    expect(plan({ first_lesson: 1 }, new Map([['first_lesson', 'bronze']])).unlocks).toEqual([]);
  });

  it('GIVEN a key the definitions table lacks WHEN planned THEN it gets no achievement row and is not announced', () => {
    const ids = new Map(IDS);
    ids.delete('first_lesson');
    const { achievementRows, unlocks } = plan({ first_lesson: 3 }, new Map(), ids);
    expect(achievementRows).toEqual([]);
    expect(unlocks).toEqual([]);
  });

  it('GIVEN a value for a key the server does not grant WHEN planned THEN it is ignored', () => {
    const { achievementRows, progressRows } = plan({ early_bird: 60, not_a_key: 9 });
    expect(achievementRows).toEqual([]);
    expect(progressRows).toEqual([]);
  });

  it('GIVEN progress below bronze WHEN planned THEN the Awards page still gets the raw count toward bronze', () => {
    expect(plan({ xp_collector: 120 }).progressRows).toEqual([
      { student_id: STUDENT, achievement_key: 'xp_collector', current_count: 120, target_count: 500, tier: 'bronze', updated_at: NOW },
    ]);
  });
});

describe('server award keys', () => {
  it('every key the server grants is one the Awards page shows as earnable', () => {
    for (const key of SERVER_AWARD_KEYS) expect(isEarnableAward(key)).toBe(true);
  });
});
