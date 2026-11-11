import { describe, it, expect } from 'vitest';
import { GAG_CATALOG, CLIP_IDS } from '../gagCatalog';
import { variantDurationMs } from '../gagDirector';
import type { BeatPhase } from '../gagTypes';

const ORDER: BeatPhase[] = ['windup', 'action', 'freeze', 'reaction'];

describe('gag catalogue', () => {
  it('covers the bible gags this pass builds', () => {
    const numbers = GAG_CATALOG.map((g) => g.bible);
    expect(numbers).toEqual(expect.arrayContaining([1, 3, 4, 6, 7, 8, 9, 12, 13, 16, 20]));
  });

  it('ids are unique, and every gag has at least two variants so nothing plays twice in a row', () => {
    expect(new Set(GAG_CATALOG.map((g) => g.id)).size).toBe(GAG_CATALOG.length);
    for (const gag of GAG_CATALOG) {
      expect(gag.variants.length).toBeGreaterThanOrEqual(gag.running ? 3 : 2);
      expect(new Set(gag.variants.map((v) => v.id)).size).toBe(gag.variants.length);
    }
  });

  it('every variant runs wind-up, fast action, freeze-frame, reaction in order', () => {
    for (const gag of GAG_CATALOG) {
      for (const v of gag.variants) {
        const ranks = v.beats.map((b) => ORDER.indexOf(b.phase));
        expect(ranks.every((r) => r >= 0)).toBe(true);
        expect([...ranks].sort((a, c) => a - c)).toEqual(ranks);
        expect(new Set(ranks).size).toBe(4);
        expect(v.beats.length).toBeGreaterThanOrEqual(3);
        expect(v.beats.length).toBeLessThanOrEqual(5);
        const action = v.beats.find((b) => b.phase === 'action')!;
        const freeze = v.beats.find((b) => b.phase === 'freeze')!;
        expect(action.ms).toBe(Math.min(...v.beats.map((b) => b.ms)));
        expect(freeze.ms).toBeGreaterThan(action.ms);
      }
    }
  });

  it('stays under 3s unless it holds until the next word or the round end', () => {
    for (const gag of GAG_CATALOG.filter((g) => !g.holdUntil)) {
      for (const v of gag.variants) expect(variantDurationMs(v)).toBeLessThan(3000);
    }
  });

  it('only references the six custom clips, each with fallback poses', () => {
    for (const gag of GAG_CATALOG) {
      for (const v of gag.variants) {
        if (v.clip) expect(CLIP_IDS).toContain(v.clip);
        for (const beat of v.beats) expect(beat.pose).toMatch(/^\/mascot\/[a-z-]+-nobg\.webp$/);
      }
    }
  });

  it('big gags are rationed to about 1 in 5; one-off real moments always land', () => {
    const byBible = (n: number) => GAG_CATALOG.find((g) => g.bible === n)!;
    expect(byBible(1).chance).toBeLessThanOrEqual(0.25);
    expect(byBible(20).chance).toBeLessThanOrEqual(0.25);
    expect(byBible(4).chance).toBe(1);
    expect(byBible(9).daily).toBe(true);
  });
});
