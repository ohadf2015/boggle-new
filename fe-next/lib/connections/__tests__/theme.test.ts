import { describe, it, expect } from 'vitest';
import { inferTheme, type PuzzleTheme } from '../theme';

/**
 * inferTheme is a SOFT, deterministic disperser. It does not need to be
 * perfectly accurate — it only needs to give a stable coarse "feel" bucket so
 * the level-order interleave and daily picker can avoid placing two
 * same-feel puzzles back-to-back.
 *
 * Precedence is word1 → word2 → bridge → misc: the player sees word1 and word2
 * (the bridge is hidden), so the visible left word dominates the felt theme,
 * with the bridge as a last-resort hint.
 */
describe('inferTheme', () => {
  const t = (word1: string, word2: string, bridge: string, theme?: PuzzleTheme) =>
    inferTheme({ word1, word2, bridge, theme });

  it('classifies nature words (from the leading word)', () => {
    expect(t('SEA', 'POWER', 'HORSE')).toBe('nature');
    expect(t('SAND', 'CLOUD', 'STORM')).toBe('nature');
    expect(t('SNOW', 'SIZE', 'CAP')).toBe('nature');
  });

  it('classifies body words', () => {
    expect(t('EYE', 'BEAT', 'BROW')).toBe('body');
    expect(t('FINGER', 'POLISH', 'NAIL')).toBe('body');
    expect(t('HEART', 'GENERATION', 'BEAT')).toBe('body');
  });

  it('classifies food words', () => {
    expect(t('BUTTER', 'CAKE', 'CUP')).toBe('food');
    expect(t('HONEY', 'OVER', 'COMB')).toBe('food');
  });

  it('classifies built structures', () => {
    expect(t('WALL', 'PAPER', 'HANG')).toBe('structure');
    expect(t('SHIP', 'SHAPE', 'BATTLE')).toBe('structure');
  });

  it('classifies tools / objects', () => {
    expect(t('SAW', 'DUST', 'JIG')).toBe('tool');
    expect(t('SCREW', 'DRIVER', 'THUMB')).toBe('tool');
  });

  it('classifies clothing / accessories', () => {
    expect(t('SHOE', 'LACE', 'HORSE')).toBe('clothing');
    expect(t('RING', 'MASTER', 'EAR')).toBe('clothing');
  });

  it('uses the bridge as a last-resort hint when both visible words are misc', () => {
    // LIGHT (misc) · HOUSE · WIFE (misc) → structure via the bridge HOUSE
    expect(t('LIGHT', 'WIFE', 'HOUSE')).toBe('structure');
  });

  it('falls back to misc for unknown / abstract words', () => {
    expect(t('ZZZ', 'QQQ', 'XYZ')).toBe('misc');
  });

  it('is deterministic — same input always yields same theme', () => {
    expect(t('SEA', 'POWER', 'HORSE')).toBe(t('SEA', 'POWER', 'HORSE'));
  });

  it('honours an explicit theme override above inference', () => {
    expect(t('SEA', 'POWER', 'HORSE', 'food')).toBe('food');
  });

  it('is case-insensitive', () => {
    expect(t('sea', 'power', 'horse')).toBe('nature');
  });
});
