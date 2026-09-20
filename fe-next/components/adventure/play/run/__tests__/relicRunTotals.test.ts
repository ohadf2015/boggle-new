import { describe, it, expect } from 'vitest';
import { clearedRunWords, relicRunContributions, runStackCtx } from '../relicRunTotals';
import { scoreWords } from '@/lib/adventure/play/scoreRun';
import type { LevelWords } from '@/lib/adventure/play/relicStack';
import type { RelicId } from '@/lib/adventure/play/relics';

const total = (levels: LevelWords[], relics: RelicId[]) =>
  levels.reduce((s, l) => s + scoreWords(l.words, { relics, kind: l.kind }).score, 0);

describe('relicRunContributions — what each owned relic has contributed THIS RUN', () => {
  it('Given three cleared levels, when a lone relic is owned, then it totals the leave-one-out share across every level', () => {
    const levels: LevelWords[] = [{ words: ['house', 'tiger'] }, { words: ['planet'] }, { words: ['cat', 'stone'] }];
    const c = relicRunContributions(levels, ['storm-rune']);
    expect(c['storm-rune']).toBe(total(levels, ['storm-rune']) - total(levels, []));
    expect(c['storm-rune']).toBeGreaterThan(0);
  });

  it('Given the run total, then it is the sum of the per-level contributions (a run number, not a level number)', () => {
    const levels: LevelWords[] = [{ words: ['house', 'tiger'] }, { words: ['house', 'tiger'] }];
    const one = relicRunContributions([levels[0]], ['storm-rune'])['storm-rune']!;
    expect(relicRunContributions(levels, ['storm-rune'])['storm-rune']).toBe(one * 2);
  });

  it('Given a relic that stacks with one already owned, then its run total beats what it would earn alone', () => {
    const levels: LevelWords[] = [{ words: ['house', 'tiger'] }, { words: ['planet', 'stone'] }];
    const stacked = relicRunContributions(levels, ['magnet', 'storm-rune'])['storm-rune']!;
    const alone = relicRunContributions(levels, ['storm-rune'])['storm-rune']!;
    expect(stacked).toBeGreaterThan(alone);
  });

  it('Given a level kind, then it is honoured (a chain level scores its words differently)', () => {
    const levels: LevelWords[] = [{ words: ['house', 'tiger'], kind: 'chain' }];
    const c = relicRunContributions(levels, ['storm-rune']);
    expect(c['storm-rune']).toBe(total(levels, ['storm-rune']) - total(levels, []));
  });

  it('Given stat relics and unknown ids, then only scoring relics get a number', () => {
    const c = relicRunContributions([{ words: ['house'] }], ['hourglass', 'nope' as RelicId, 'twin-ink']);
    expect(Object.keys(c)).toEqual(['twin-ink']);
  });

  it('Given no words found yet this run, then every scoring relic reads 0 rather than going missing', () => {
    expect(relicRunContributions([{ words: [] }], ['magnet'])).toEqual({ magnet: 0 });
    expect(relicRunContributions([], ['magnet'])).toEqual({ magnet: 0 });
  });

  it('Given a duplicated relic id, then it is counted once', () => {
    const levels: LevelWords[] = [{ words: ['house'] }];
    expect(relicRunContributions(levels, ['magnet', 'magnet'])).toEqual(relicRunContributions(levels, ['magnet']));
  });
});

describe('clearedRunWords — banked words are keyed by STEP, not by the level slot', () => {
  const banked = [['planet'], ['stone'], ['river'], ['candle'], ['marble'], ['silver']];
  const seed = (levels: string[][]) => {
    const m = new Map<string, string>([['adv-run-words-w1', JSON.stringify(levels)]]);
    (globalThis as { sessionStorage?: unknown }).sessionStorage = {
      getItem: (k: string) => m.get(k) ?? null, setItem: () => {}, removeItem: () => {},
    };
  };

  it('Given six cleared nodes, when the seventh is played, then all six count', () => {
    seed(banked);
    expect(clearedRunWords(1, 7)).toEqual(banked);
  });

  it('Given rows 4-7 all play level 6, then keying by that level would drop cleared nodes — step does not', () => {
    seed(banked);
    // The level slot would be 6 for every one of those rows: slice(0, 6-1) loses the sixth.
    expect(banked.slice(0, 6 - 1)).toHaveLength(5);
    expect(clearedRunWords(1, 7)).toHaveLength(6);
  });

  it('Given the first node of a run, then nothing is banked yet', () => {
    seed(banked);
    expect(clearedRunWords(1, 1)).toEqual([]);
    expect(clearedRunWords(1, 0)).toEqual([]);
  });
});

describe('runStackCtx — the map screen has no board, so the rail reads the run out of storage', () => {
  const banked = [['house', 'tiger'], ['planet']];
  const seed = (levels: string[][]) => {
    const m = new Map<string, string>([['adv-run-words-w1', JSON.stringify(levels)]]);
    (globalThis as { sessionStorage?: unknown }).sessionStorage = {
      getItem: (k: string) => m.get(k) ?? null, setItem: () => {}, removeItem: () => {},
    };
  };

  it('Given cleared nodes, then it yields one level per cleared step, carrying the run’s relics', () => {
    seed(banked);
    const ctx = runStackCtx(1, 3, ['magnet']);
    expect(ctx.levels.map((l) => l.words)).toEqual(banked);
    expect(ctx.owned).toEqual(['magnet']);
    // The level's own kind comes along, so a chain node is not scored as a classic one.
    expect(ctx.levels[0]).toHaveProperty('kind');
  });

  it('Given that context, then the tooltip’s run total is the leave-one-out share over those levels', () => {
    seed(banked);
    const ctx = runStackCtx(1, 3, ['magnet']);
    expect(relicRunContributions(ctx.levels, ctx.owned).magnet)
      .toBe(total(ctx.levels as LevelWords[], ['magnet']) - total(ctx.levels as LevelWords[], []));
  });

  it('Given the very first node, then there are no levels and every relic reads 0 rather than going missing', () => {
    seed(banked);
    const ctx = runStackCtx(1, 1, ['magnet']);
    expect(ctx.levels).toEqual([]);
    expect(relicRunContributions(ctx.levels, ctx.owned)).toEqual({ magnet: 0 });
  });
});
