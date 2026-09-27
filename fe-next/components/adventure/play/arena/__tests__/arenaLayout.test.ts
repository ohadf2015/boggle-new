import { describe, it, expect } from 'vitest';
import { arenaLayout, ARENA_RATIO, HUD_BAND } from '../arenaLayout';

describe('arenaLayout', () => {
  it('puts the hero and the foe on opposite sides, both standing on the ground line', () => {
    const l = arenaLayout(358, 184, false);
    expect(l.hero.x).toBeLessThan(l.foe.x);
    // feet on the same ground line
    expect(l.hero.y + l.hero.h).toBeCloseTo(l.groundY, 0);
    expect(l.foe.y + l.foe.h).toBeCloseTo(l.groundY, 0);
  });

  it('mirrors the sides in RTL so the hero always stands on the reading-start side', () => {
    const ltr = arenaLayout(358, 184, false);
    const rtl = arenaLayout(358, 184, true);
    expect(rtl.hero.x).toBeGreaterThan(rtl.foe.x);
    expect(rtl.hero.x + rtl.hero.w / 2).toBeCloseTo(358 - (ltr.hero.x + ltr.hero.w / 2), 0);
  });

  it('makes the foe the bigger silhouette', () => {
    const l = arenaLayout(358, 184, false);
    expect(l.foe.h).toBeGreaterThan(l.hero.h);
  });

  it('keeps both fighters inside the canvas at a narrow phone width', () => {
    const l = arenaLayout(320, 150, false);
    for (const s of [l.hero, l.foe]) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x + s.w).toBeLessThanOrEqual(320);
      expect(s.y).toBeGreaterThanOrEqual(0);
    }
  });

  it('puts the foe hand anchor on the hero side of the foe, above the ground', () => {
    const l = arenaLayout(358, 184, false);
    expect(l.foeHand.x).toBeLessThan(l.foe.x + l.foe.w / 2);
    expect(l.foeHand.x).toBeGreaterThan(l.foe.x - l.foe.w);
    expect(l.foeHand.y).toBeLessThan(l.groundY);
  });

  it('puts the hero anchor on the hero chest', () => {
    const l = arenaLayout(358, 184, false);
    expect(l.heroHit.x).toBeGreaterThan(l.hero.x);
    expect(l.heroHit.x).toBeLessThan(l.hero.x + l.hero.w);
    expect(l.heroHit.y).toBeGreaterThan(l.hero.y);
    expect(l.heroHit.y).toBeLessThan(l.groundY);
  });

  it('exposes a stage aspect ratio a caller can size a box with', () => {
    expect(ARENA_RATIO).toBeGreaterThan(1);
  });
});

describe('heroCallout', () => {
  // THE BUG THIS PINS: the "-1 ♥" a strike floats over the hero was drawn at the
  // hero's head (~y 64 of a 194px stage). `ArenaStage` parks the DOM intent panel
  // at x 1..146, y 24..89 of the same box — so on a real elite the float rendered
  // every time and was never once visible. The canvas cannot see that panel, so
  // the layout reserves the band for it.
  it('places the hero callout below the band the DOM HUD occupies', () => {
    for (const [w, h] of [[352, 194], [358, 200], [320, 150]] as const) {
      const l = arenaLayout(w, h, false);
      expect(l.heroCallout.y).toBeGreaterThan(h * HUD_BAND);
      // …and it must still be ON the hero, not down in the floor.
      expect(l.heroCallout.y).toBeLessThan(l.groundY);
      expect(Math.abs(l.heroCallout.x - (l.hero.x + l.hero.w / 2))).toBeLessThanOrEqual(1);
    }
  });

  it('keeps the whole rise clear of the HUD band, not just the start', () => {
    const l = arenaLayout(352, 194, false);
    expect(l.heroCallout.y - l.calloutRise).toBeGreaterThanOrEqual(194 * HUD_BAND);
  });

  it('mirrors with the hero in RTL', () => {
    const ltr = arenaLayout(358, 184, false);
    const rtl = arenaLayout(358, 184, true);
    expect(Math.abs(rtl.heroCallout.x - (358 - ltr.heroCallout.x))).toBeLessThanOrEqual(1);
    expect(rtl.heroCallout.y).toBe(ltr.heroCallout.y);
  });
});
