import { describe, it, expect } from 'vitest';
import {
  getDailyQuests,
  evaluateDailyQuests,
  emptyQuestResult,
  DAILY_QUEST_POOL,
  QUEST_PUBLIC_MODES,
  type DailyQuest,
  type QuestGameResult,
} from '../dailyQuestPool';

const DATES = Array.from({ length: 60 }, (_, day) =>
  new Date(Date.UTC(2026, 4, 1) + day * 86_400_000).toISOString().split('T')[0],
);

describe('getDailyQuests', () => {
  it('returns exactly 3 quests', () => {
    expect(getDailyQuests('2026-05-13')).toHaveLength(3);
  });

  it('returns 3 distinct quest ids', () => {
    const ids = getDailyQuests('2026-05-13').map(q => q.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('returns only quests from the pool', () => {
    const poolIds = new Set(DAILY_QUEST_POOL.map(q => q.id));
    for (const q of getDailyQuests('2026-05-13')) {
      expect(poolIds).toContain(q.id);
    }
  });

  it('is deterministic — same date yields same quests', () => {
    expect(getDailyQuests('2026-05-13')).toEqual(getDailyQuests('2026-05-13'));
  });

  it('uses current date when none provided', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(getDailyQuests()).toEqual(getDailyQuests(today));
  });

  it('never serves two quests of the same condition type in a day', () => {
    for (const date of DATES) {
      const types = getDailyQuests(date).map(q => q.type);
      expect(new Set(types).size).toBe(types.length);
    }
  });

  it('serves at most one PvP quest per day (soloable Grand Slam)', () => {
    for (const date of DATES) {
      const pvp = getDailyQuests(date).filter(q => q.family === 'pvp');
      expect(pvp.length).toBeLessThanOrEqual(1);
    }
  });

  it('every quest href points to a public (non-beta) route', () => {
    const publicHrefs = new Set(['/daily', '/multiplayer', '/brain', '/singleplayer']);
    for (const date of DATES) {
      for (const q of getDailyQuests(date)) {
        expect(publicHrefs).toContain(q.href);
      }
    }
  });

  it('never references adventure or any beta mode', () => {
    for (const date of DATES) {
      for (const q of getDailyQuests(date)) {
        expect(q.href).not.toContain('adventure');
        expect(q.mode ?? '').not.toBe('adventure');
        if (q.mode) expect(QUEST_PUBLIC_MODES).toContain(q.mode);
      }
    }
  });

  it('produces variety across 20 consecutive dates', () => {
    const seen = new Set(DATES.slice(0, 20).map(d => getDailyQuests(d).map(q => q.id).join(',')));
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('evaluateDailyQuests', () => {
  const byId = (id: string): DailyQuest => {
    const q = DAILY_QUEST_POOL.find(x => x.id === id);
    if (!q) throw new Error(`no quest ${id}`);
    return q;
  };
  const run = (ids: string[], partial: Partial<QuestGameResult>): number[] =>
    evaluateDailyQuests(ids.map(byId), emptyQuestResult(partial));

  it('returns the slot index of a satisfied longWord quest', () => {
    expect(run(['long_word_7'], { longestWordLength: 7 })).toEqual([0]);
  });

  it('does not complete longWord below target', () => {
    expect(run(['long_word_7'], { longestWordLength: 6 })).toEqual([]);
  });

  it('completes score quest at/above target only', () => {
    expect(run(['score_500'], { score: 500 })).toEqual([0]);
    expect(run(['score_500'], { score: 499 })).toEqual([]);
  });

  it('completes combo quest at/above target only', () => {
    expect(run(['combo_6'], { maxCombo: 6 })).toEqual([0]);
    expect(run(['combo_6'], { maxCombo: 5 })).toEqual([]);
  });

  it('beatHuman requires outscoring a real human, not a bot', () => {
    expect(run(['beat_human'], { beatHumanOpponent: true })).toEqual([0]);
    // top of an all-bot lobby — no human beaten
    expect(run(['beat_human'], { isTopHuman: true, beatHumanOpponent: false, humanOpponentCount: 0 })).toEqual([]);
  });

  it('mpWin requires being top human with at least one human opponent', () => {
    expect(run(['mp_win'], { isMultiplayer: true, isTopHuman: true, humanOpponentCount: 1 })).toEqual([0]);
    expect(run(['mp_win'], { isMultiplayer: true, isTopHuman: true, humanOpponentCount: 0 })).toEqual([]);
  });

  it('playMode multiplayer completes only on a real multiplayer game', () => {
    expect(run(['play_mp'], { isMultiplayer: true })).toEqual([0]);
    expect(run(['play_mp'], { isMultiplayer: false })).toEqual([]);
  });

  it('returns multiple slot indices when several of today\'s quests are satisfied', () => {
    const idx = run(['long_word_7', 'score_500'], { longestWordLength: 8, score: 600 });
    expect(idx).toEqual([0, 1]);
  });

  it('returns empty for an empty result (no silent false-positive)', () => {
    expect(run(['long_word_7', 'score_500', 'words_15'], {})).toEqual([]);
  });
});
