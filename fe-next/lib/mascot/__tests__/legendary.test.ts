import { describe, it, expect } from 'vitest';
import {
  LEGENDARY_GAGS,
  LEGENDARY_CHANCE,
  rollLegendaryRound,
  shouldTriggerLegendary,
  gagDurationMs,
  beatIndexAt,
  type BeatPhase,
} from '../legendary';
import { createSeededRng } from '../rng';

const PHASE_ORDER: BeatPhase[] = ['windup', 'action', 'freeze', 'reaction'];

describe('legendary gag catalogue', () => {
  it('every gag has 3-5 beats and lasts under 3s', () => {
    expect(LEGENDARY_GAGS.length).toBeGreaterThanOrEqual(3);
    for (const gag of LEGENDARY_GAGS) {
      expect(gag.beats.length).toBeGreaterThanOrEqual(3);
      expect(gag.beats.length).toBeLessThanOrEqual(5);
      expect(gagDurationMs(gag)).toBeLessThan(3000);
      for (const beat of gag.beats) expect(beat.pose).toMatch(/^\/mascot\/.+-nobg\.webp$/);
    }
  });

  it('every gag runs wind-up, fast action, freeze-frame, reaction in that order', () => {
    for (const gag of LEGENDARY_GAGS) {
      const phases = gag.beats.map((b) => b.phase);
      const firstSeen = PHASE_ORDER.map((p) => phases.indexOf(p));
      expect(firstSeen.every((i) => i >= 0)).toBe(true);
      expect([...firstSeen].sort((a, b) => a - b)).toEqual(firstSeen);
      const ranks = phases.map((p) => PHASE_ORDER.indexOf(p));
      expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
    }
  });

  it('the action is the fastest beat and the freeze holds longer than it', () => {
    for (const gag of LEGENDARY_GAGS) {
      const action = gag.beats.find((b) => b.phase === 'action')!;
      const freeze = gag.beats.find((b) => b.phase === 'freeze')!;
      expect(action.ms).toBe(Math.min(...gag.beats.map((b) => b.ms)));
      expect(freeze.ms).toBeGreaterThan(action.ms);
    }
  });

  it('every gag lets out the signature cry on its action beat', () => {
    for (const gag of LEGENDARY_GAGS) {
      expect(gag.beats.find((b) => b.phase === 'action')!.cry).toBe(true);
    }
  });

  it('gag ids are unique', () => {
    const ids = LEGENDARY_GAGS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('beatIndexAt', () => {
  const gag = LEGENDARY_GAGS[0];
  it('walks through the beats by elapsed time and ends past the last one', () => {
    expect(beatIndexAt(gag, 0)).toBe(0);
    expect(beatIndexAt(gag, gag.beats[0].ms)).toBe(1);
    expect(beatIndexAt(gag, gagDurationMs(gag) - 1)).toBe(gag.beats.length - 1);
    expect(beatIndexAt(gag, gagDurationMs(gag))).toBe(-1);
  });
});

describe('rollLegendaryRound', () => {
  it('lands on roughly 1% of rounds', () => {
    expect(LEGENDARY_CHANCE).toBe(0.01);
    const rng = createSeededRng(123);
    let hits = 0;
    for (let i = 0; i < 20_000; i++) if (rollLegendaryRound(rng)) hits++;
    expect(hits / 20_000).toBeGreaterThan(0.006);
    expect(hits / 20_000).toBeLessThan(0.014);
  });

  it('is deterministic for a seed', () => {
    const a = rollLegendaryRound(createSeededRng(9), { chance: 1 });
    expect(a).toEqual(rollLegendaryRound(createSeededRng(9), { chance: 1 }));
    expect(a).not.toBeNull();
  });

  it('can land on every gag', () => {
    const rng = createSeededRng(1);
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const plan = rollLegendaryRound(rng, { chance: 1 });
      if (plan) seen.add(plan.id);
    }
    expect(seen.size).toBe(LEGENDARY_GAGS.length);
  });

  it('a miss returns null', () => {
    expect(rollLegendaryRound(() => 0.5, { chance: 0.01 })).toBeNull();
  });
});

describe('shouldTriggerLegendary', () => {
  const longWord = LEGENDARY_GAGS.find((g) => g.trigger.kind === 'long-word')!;
  const afterWords = LEGENDARY_GAGS.find((g) => g.trigger.kind === 'word-count')!;

  it('the photobomb waits for a 7+ letter word', () => {
    expect(shouldTriggerLegendary(longWord, { wordsFound: 5, wordLength: 6 })).toBe(false);
    expect(shouldTriggerLegendary(longWord, { wordsFound: 5, wordLength: 7 })).toBe(true);
  });

  it('other gags wait for the Nth word of the round', () => {
    const n = afterWords.trigger.kind === 'word-count' ? afterWords.trigger.count : 0;
    expect(shouldTriggerLegendary(afterWords, { wordsFound: n - 1, wordLength: 4 })).toBe(false);
    expect(shouldTriggerLegendary(afterWords, { wordsFound: n, wordLength: 4 })).toBe(true);
  });
});

describe('variation pool', () => {
  it('never repeats the previous gag twice in a row', () => {
    const rng = createSeededRng(5);
    let last: string | null = null;
    for (let i = 0; i < 300; i++) {
      const plan = rollLegendaryRound(rng, { chance: 1, lastGagId: last });
      expect(plan).not.toBeNull();
      expect(plan!.id).not.toBe(last);
      last = plan!.id;
    }
  });

  it('plays from any pool of gag definitions handed to it', () => {
    const custom = [{ ...LEGENDARY_GAGS[0], id: 'custom-a' }, { ...LEGENDARY_GAGS[1], id: 'custom-b' }];
    const plan = rollLegendaryRound(() => 0, { chance: 1, pool: custom, lastGagId: 'custom-a' });
    expect(plan!.id).toBe('custom-b');
  });

  it('a pool of one still plays even if it was the last gag', () => {
    const plan = rollLegendaryRound(() => 0, { chance: 1, pool: [LEGENDARY_GAGS[0]], lastGagId: LEGENDARY_GAGS[0].id });
    expect(plan!.id).toBe(LEGENDARY_GAGS[0].id);
  });
});
