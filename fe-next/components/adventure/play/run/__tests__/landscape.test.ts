import { describe, it, expect } from 'vitest';
import {
  isWideRun,
  wideRelicSlotPx,
  wideRailPx,
  wideRelicRows,
  runShellCss,
  WIDE_MEDIA,
} from '../landscape';
import { RELIC_IDS } from '@/lib/adventure/play/relics';

describe('isWideRun', () => {
  it('is false on the phone the run is designed for', () => {
    expect(isWideRun(390, 844)).toBe(false);
  });

  it('is true on a TV / desktop canvas', () => {
    expect(isWideRun(1920, 1080)).toBe(true);
    expect(isWideRun(1280, 720)).toBe(true);
  });

  it('is false on a tall tablet, however wide', () => {
    // 1024x1366 is wider than the width gate but nowhere near landscape.
    expect(isWideRun(1024, 1366)).toBe(false);
  });

  it('is false on a landscape PHONE — too little width for three columns', () => {
    expect(isWideRun(844, 390)).toBe(false);
  });

  it('never claims wide for a degenerate viewport', () => {
    expect(isWideRun(0, 0)).toBe(false);
  });
});

describe('wideRelicSlotPx', () => {
  it('steps up with the canvas, so a TV chip is not a phone chip', () => {
    expect(wideRelicSlotPx(1920)).toBeGreaterThan(wideRelicSlotPx(1280));
    expect(wideRelicSlotPx(1280)).toBeGreaterThan(wideRelicSlotPx(1000));
  });

  it('never renders a relic below the legibility floor', () => {
    expect(wideRelicSlotPx(900)).toBeGreaterThanOrEqual(32);
  });
});

describe('the wide relic strip', () => {
  it('holds the WHOLE relic catalog on ONE row at 1920 — that is what "one continuous strip" means', () => {
    expect(wideRelicRows(RELIC_IDS.length, 1920)).toBe(1);
  });

  it('still holds a big haul in at most two rows at 1280', () => {
    expect(wideRelicRows(RELIC_IDS.length, 1280)).toBeLessThanOrEqual(2);
  });

  it('gives the rail the canvas minus the resource cluster', () => {
    expect(wideRailPx(1920)).toBeGreaterThan(wideRailPx(1280));
    expect(wideRailPx(1920)).toBeLessThan(1920);
  });

  it('has no rows to draw with no relics', () => {
    expect(wideRelicRows(0, 1920)).toBe(0);
  });
});

describe('runShellCss', () => {
  const css = runShellCss();

  it('puts EVERY rule behind the landscape query — nothing may leak into the phone layout', () => {
    // One top-level block, and it is the media query itself.
    expect(css.trimStart().startsWith('@media')).toBe(true);
    expect(css.match(/@media/g)).toHaveLength(1);
    // Balanced braces: a stray close would end the query early and leak the rest.
    expect((css.match(/\{/g) ?? []).length).toBe((css.match(/\}/g) ?? []).length);
  });

  it('is keyed on the same query the predicate implements', () => {
    expect(css).toContain(WIDE_MEDIA);
  });

  it('lays the shell out as a grid with the board beside the stage, not under it', () => {
    expect(css).toContain('grid-template-areas');
    expect(css).toMatch(/"stage\s+board\s+words"/);
  });

  it('releases the phone column cap and the phone board cap', () => {
    expect(css).toContain('max-width: none');
    expect(css).toContain('--adv-board-max');
  });
});
