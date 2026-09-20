import { describe, it, expect } from 'vitest';
import { relicContributions, relicStack, type LevelWords } from '../relicStack';
import { scoreWords } from '../scoreRun';
import type { RelicId } from '../relics';

const score = (words: string[], relics: RelicId[], kind?: LevelWords['kind']) => scoreWords(words, { relics, kind }).score;

describe('relicContributions — what each owned relic is earning THIS level', () => {
  it('Given storm-rune and two 5-letter words, when scored, then it earns exactly what scoreWords credits for it', () => {
    const words = ['house', 'tiger', 'planet'];
    const c = relicContributions(words, ['storm-rune']);
    expect(c['storm-rune']).toBe(score(words, ['storm-rune']) - score(words, []));
    expect(c['storm-rune']).toBe(10);
  });

  it('Given magnet owned, when storm-rune stacks, then storm-rune earns MORE than alone (its flat bonus is multiplied)', () => {
    const words = ['house', 'tiger'];
    const c = relicContributions(words, ['magnet', 'storm-rune']);
    expect(c['storm-rune']).toBe(score(words, ['magnet', 'storm-rune']) - score(words, ['magnet']));
    expect(c['storm-rune']).toBeGreaterThan(10);
    expect(c.magnet).toBe(score(words, ['magnet', 'storm-rune']) - score(words, ['storm-rune']));
  });

  it('Given stat relics and unknown ids, then only scoring relics get a number', () => {
    const c = relicContributions(['house'], ['hourglass', 'nope' as RelicId, 'twin-ink']);
    expect(Object.keys(c)).toEqual(['twin-ink']);
    expect(c['twin-ink']).toBe(50);
  });

  it('Given no words yet, then every scoring relic reads 0 (not missing)', () => {
    expect(relicContributions([], ['magnet'])).toEqual({ magnet: 0 });
  });

  it('Given a chain level, then a word that breaks the chain earns the relic nothing', () => {
    const words = ['house', 'tiger'];
    const c = relicContributions(words, ['storm-rune'], 'chain');
    expect(c['storm-rune']).toBe(score(words, ['storm-rune'], 'chain') - score(words, [], 'chain'));
    expect(c['storm-rune']).toBe(5);
  });
});

const levels: LevelWords[] = [
  { words: ['cat', 'house', 'tiger'], seconds: 90 },
  { words: ['planet', 'garden', 'sun'], seconds: 90 },
];

describe('relicStack — the relic ALONE vs STACKED with what the run owns, per level', () => {
  it('Given no owned relics, then alone equals combined and it is the per-level gain from scoreWords', () => {
    const s = relicStack('magnet', { levels, owned: [] })!;
    const gain = levels.reduce((t, l) => t + score(l.words, ['magnet']) - score(l.words, []), 0);
    expect(s.alone).toBe(Math.round(gain / 2));
    expect(s.combined).toBe(s.alone);
    expect(s.synergy).toBe(false);
  });

  it('Given magnet owned, when storm-rune is offered, then combined > alone and synergy is flagged', () => {
    const s = relicStack('storm-rune', { levels, owned: ['magnet'] })!;
    expect(s.alone).toBe(5); // two 5-letter words over two levels
    const gain = levels.reduce((t, l) => t + score(l.words, ['magnet', 'storm-rune']) - score(l.words, ['magnet']), 0);
    expect(s.combined).toBe(Math.round(gain / 2));
    expect(s.combined).toBeGreaterThan(s.alone);
    expect(s.synergy).toBe(true);
  });

  it('Given the relic is already owned (tooltip), then combined is its leave-one-out share, not doubled', () => {
    const offered = relicStack('storm-rune', { levels, owned: ['magnet'] })!;
    const owned = relicStack('storm-rune', { levels, owned: ['magnet', 'storm-rune'] })!;
    expect(owned).toEqual(offered);
  });

  it('Given hourglass (+10s), then it is priced as 10 more seconds at the run pace: base pace alone, relic pace stacked', () => {
    const base = levels.reduce((t, l) => t + score(l.words, []), 0);
    const withMagnet = levels.reduce((t, l) => t + score(l.words, ['magnet']), 0);
    const s = relicStack('hourglass', { levels, owned: ['magnet'] })!;
    expect(s.alone).toBe(Math.round((base / 180) * 10));
    expect(s.combined).toBe(Math.round((withMagnet / 180) * 10));
    expect(s.combined).toBeGreaterThan(s.alone);
    expect(s.synergy).toBe(true);
  });

  it('Given a level with no seconds, then it assumes a 90s level', () => {
    const s = relicStack('hourglass', { levels: [{ words: ['house'] }], owned: [] })!;
    expect(s.alone).toBe(Math.round((50 / 90) * 10));
  });

  it('Given no words this run, then there is no number to show (null, never a fake 0)', () => {
    expect(relicStack('magnet', { levels: [], owned: [] })).toBeNull();
    expect(relicStack('magnet', { levels: [{ words: [] }], owned: [] })).toBeNull();
  });

  it('Given a stat relic that does not score, then null', () => {
    expect(relicStack('heart-locket', { levels, owned: [] })).toBeNull();
  });

  it('Given a word count, then hits counts words the relic actually changed', () => {
    expect(relicStack('storm-rune', { levels, owned: [] })!.hits).toBe(2);
    expect(relicStack('hourglass', { levels, owned: [] })!.hits).toBe(0);
  });
});
