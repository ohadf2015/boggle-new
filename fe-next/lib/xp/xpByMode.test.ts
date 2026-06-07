import { describe, it, expect } from 'vitest';
import { splitXpByMode, OTHER_MODE, type ModeAggregate } from './xpByMode';

describe('splitXpByMode', () => {
  it('returns empty when total XP is zero', () => {
    const rows: ModeAggregate[] = [{ mode: 'blast', games: 3, score: 400 }];
    expect(splitXpByMode(rows, 0)).toEqual([]);
  });

  it('returns empty when there are no game rows', () => {
    expect(splitXpByMode([], 1000)).toEqual([]);
  });

  it('returns empty when all weights are zero (no games, no score)', () => {
    const rows: ModeAggregate[] = [{ mode: 'blast', games: 0, score: 0 }];
    expect(splitXpByMode(rows, 1000)).toEqual([]);
  });

  it('surfaces unattributed XP (solo + bonus, not in game_results) as an Other slice', () => {
    // blast attributed = 5*50 + 0.15*1000 = 400; total 2500 → Other = 2100
    const rows: ModeAggregate[] = [{ mode: 'blast', games: 5, score: 1000 }];
    const result = splitXpByMode(rows, 2500);
    expect(result).toEqual([
      { mode: 'blast', xp: 400, share: 400 / 2500 },
      { mode: OTHER_MODE, xp: 2100, share: 2100 / 2500 },
    ]);
  });

  it('always reconciles all slices (incl Other) exactly to total XP', () => {
    const rows: ModeAggregate[] = [
      { mode: 'classic', games: 10, score: 5000 },
      { mode: 'blast', games: 4, score: 1200 },
      { mode: 'word-hunt', games: 7, score: 3300 },
    ];
    const total = 7777;
    const result = splitXpByMode(rows, total);
    const sum = result.reduce((acc, s) => acc + s.xp, 0);
    expect(sum).toBe(total);
  });

  it('uses absolute estimate (games*50 + 0.15*score) per mode, not a normalized share', () => {
    // classic attributed = 2*50 = 100; blast = 0.15*2000 = 300; total 1000 → Other = 600
    const rows: ModeAggregate[] = [
      { mode: 'classic', games: 2, score: 0 },
      { mode: 'blast', games: 0, score: 2000 },
    ];
    const result = splitXpByMode(rows, 1000);
    expect(result.find((s) => s.mode === 'classic')!.xp).toBe(100);
    expect(result.find((s) => s.mode === 'blast')!.xp).toBe(300);
    expect(result.find((s) => s.mode === OTHER_MODE)!.xp).toBe(600);
  });

  it('places the Other slice last even when it is the largest', () => {
    const rows: ModeAggregate[] = [{ mode: 'blast', games: 1, score: 0 }];
    const result = splitXpByMode(rows, 5000); // blast 50, Other 4950
    expect(result[result.length - 1].mode).toBe(OTHER_MODE);
  });

  it('sorts the real modes by xp descending (Other excluded from sort)', () => {
    const rows: ModeAggregate[] = [
      { mode: 'blast', games: 1, score: 100 },
      { mode: 'classic', games: 20, score: 9000 },
      { mode: 'word-hunt', games: 5, score: 1000 },
    ];
    const result = splitXpByMode(rows, 50000);
    const realModes = result.filter((s) => s.mode !== OTHER_MODE).map((s) => s.mode);
    expect(realModes).toEqual(['classic', 'word-hunt', 'blast']);
  });

  it('scales modes down and drops Other when the estimate exceeds total XP', () => {
    // attributed: classic 1000+? -> big; total small → no unattributed remainder
    const rows: ModeAggregate[] = [
      { mode: 'classic', games: 100, score: 0 }, // attributed 5000
      { mode: 'blast', games: 100, score: 0 }, // attributed 5000
    ];
    const total = 4000; // estimate 10000 > total → scale to fit, no Other
    const result = splitXpByMode(rows, total);
    expect(result.some((s) => s.mode === OTHER_MODE)).toBe(false);
    expect(result.reduce((a, s) => a + s.xp, 0)).toBe(total);
    expect(result.find((s) => s.mode === 'classic')!.xp).toBe(2000);
    expect(result.find((s) => s.mode === 'blast')!.xp).toBe(2000);
  });

  it('drops zero-weight modes from the result', () => {
    const rows: ModeAggregate[] = [
      { mode: 'classic', games: 5, score: 1000 }, // attributed 400
      { mode: 'word-hunt', games: 0, score: 0 },
    ];
    const result = splitXpByMode(rows, 400);
    expect(result.map((s) => s.mode)).toEqual(['classic']); // exact fit, no Other
  });
});
