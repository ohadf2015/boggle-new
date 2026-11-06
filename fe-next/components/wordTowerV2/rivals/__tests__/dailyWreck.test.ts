import { describe, it, expect } from 'vitest';
import { dailyRivalTower, wreckSuggestion } from '../dailyWreck';

const row = (rank: number, name: string, m: number, extra: Partial<{ isYou: boolean; words: string[]; floors: number }> = {}) => ({
  rank, username: name, bestHeightM: m, floors: 3, words: [] as string[], isYou: false, ...extra,
});

describe('wreckSuggestion', () => {
  it('Given someone just above me, Then they are the target and the gap is how far ahead they are', () => {
    const s = wreckSuggestion([row(1, 'Ana', 40), row(2, 'Ben', 25), row(3, 'Me', 18, { isYou: true }), row(4, 'Cy', 9)]);
    expect(s).toEqual({ target: expect.objectContaining({ username: 'Ben' }), kind: 'ahead', gapM: 7 });
  });

  it('Given I lead, Then the runner-up chasing me is the target', () => {
    const s = wreckSuggestion([row(1, 'Me', 30, { isYou: true }), row(2, 'Ben', 26)]);
    expect(s).toEqual({ target: expect.objectContaining({ username: 'Ben' }), kind: 'chasing', gapM: 4 });
  });

  it('Given I am not on the board yet, Then the leader is the target', () => {
    const s = wreckSuggestion([row(1, 'Ana', 40), row(2, 'Ben', 25)]);
    expect(s?.target.username).toBe('Ana');
    expect(s?.kind).toBe('leader');
  });

  it('Given nobody else climbed today, Then there is nothing to suggest', () => {
    expect(wreckSuggestion([row(1, 'Me', 12, { isYou: true })])).toBeNull();
    expect(wreckSuggestion([])).toBeNull();
  });
});

describe('dailyRivalTower', () => {
  it('Given stored words, Then the building is their real floors', () => {
    const tower = dailyRivalTower(row(1, 'Ana', 9, { words: ['sun', 'moon', 'star'] }));
    expect(tower.map((b) => b.word)).toEqual(['sun', 'moon', 'star']);
  });

  it('Given an older row with no words, Then a stand-in building of their floor count still stands', () => {
    const tower = dailyRivalTower(row(1, 'Ana', 30, { floors: 10 }));
    expect(tower).toHaveLength(10);
    expect(new Set(tower.map((b) => b.y)).size).toBe(10);
  });

  it('Given a huge climb, Then the stand-in is capped at a wreckable size and never empty', () => {
    expect(dailyRivalTower(row(1, 'Ana', 900, { floors: 300 })).length).toBeLessThanOrEqual(24);
    expect(dailyRivalTower(row(1, 'Ana', 1, { floors: 0 })).length).toBeGreaterThanOrEqual(3);
  });
});
