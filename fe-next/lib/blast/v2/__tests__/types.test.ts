import { describe, it, expect } from 'vitest';
import type { BlastLevel, CellId, TileFlag, MechanicSet, Locale, ThemeKey } from '../types';

describe('Blast v2 types', () => {
  it('CellId template enforces c<col>r<row> shape', () => {
    const ok: CellId = 'c0r0';
    expect(ok).toBe('c0r0');
  });
  it('TileFlag includes all 4 variants', () => {
    const flags: TileFlag[] = ['coin', 'gem', 'frozen', 'double_bonus'];
    expect(flags).toHaveLength(4);
  });
  it('Locale enumerates all 5 supported languages', () => {
    const locales: Locale[] = ['en', 'he', 'sv', 'ja', 'es'];
    expect(locales).toHaveLength(5);
  });
  it('ThemeKey includes onboarding', () => {
    const t: ThemeKey = 'onboarding';
    expect(t).toBe('onboarding');
  });
  it('MechanicSet exposes 12 boolean gates', () => {
    const m: MechanicSet = {
      coinOverlay: false, reverseSelection: false, shuffleButton: false,
      gemTiles: false, frozenTiles: false, cascadeWords: false,
      doubleBonusTile: false, revealLetterHint: false, bonusDictionary: false,
      revealWordHint: false, lateralSlideGravity: false, multiWordReveal: false,
    };
    expect(Object.keys(m)).toHaveLength(12);
  });
  it('BlastLevel allows interestingnessScore optional', () => {
    const lvl: BlastLevel = {
      id: 'x', levelNumber: 1, theme: 'fruits', locale: 'en',
      words: ['APPLE'], columns: [{ index: 0, tiles: ['A','P','P','L','E'] }],
      resolvableOrder: ['APPLE'], tileFlags: {}, difficulty: 1,
    };
    expect(lvl.interestingnessScore).toBeUndefined();
  });
});
