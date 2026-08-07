import { describe, it, expect } from 'vitest';
import {
  craneBeamBricks,
  craneBeamTilePx,
  CRANE_BEAM_MAX_BRICKS,
  CRANE_BEAM_TILE_MIN_PX,
  CRANE_BEAM_TILE_MAX_PX,
  CRANE_BEAM_BUDGET_PX,
} from '../craneBeamDisplay';

describe('craneBeamBricks — show the whole word, badge only the rare overflow', () => {
  it('shows every letter when the word fits the cap (no overflow)', () => {
    const { chars, hiddenCount } = craneBeamBricks('CAT');
    expect(chars).toEqual(['C', 'A', 'T']);
    expect(hiddenCount).toBe(0);
  });

  it('shows a normal long word IN FULL (no stub) — founder: show all letters', () => {
    const { chars, hiddenCount } = craneBeamBricks('CONIFER'); // 7 letters ≤ cap
    expect(chars).toEqual(['C', 'O', 'N', 'I', 'F', 'E', 'R']);
    expect(hiddenCount).toBe(0);
  });

  it('caps only a pathologically long word and badges the remainder', () => {
    const word = 'A'.repeat(CRANE_BEAM_MAX_BRICKS + 4);
    const { chars, hiddenCount } = craneBeamBricks(word);
    expect(chars.length).toBe(CRANE_BEAM_MAX_BRICKS);
    expect(hiddenCount).toBe(4);
  });

  it('never returns more bricks than the cap, for any length', () => {
    for (let n = 0; n <= 20; n++) {
      const word = 'A'.repeat(n);
      const { chars } = craneBeamBricks(word);
      expect(chars.length).toBeLessThanOrEqual(CRANE_BEAM_MAX_BRICKS);
    }
  });

  it('preserves letter order (base = word[0])', () => {
    expect(craneBeamBricks('TOWER').chars[0]).toBe('T');
  });

  it('handles empty / nullish input gracefully', () => {
    expect(craneBeamBricks('')).toEqual({ chars: [], hiddenCount: 0 });
    // @ts-expect-error guarding runtime nullish
    expect(craneBeamBricks(undefined)).toEqual({ chars: [], hiddenCount: 0 });
  });

  it('respects a custom cap', () => {
    const { chars, hiddenCount } = craneBeamBricks('TOWER', 2);
    expect(chars).toEqual(['T', 'O']);
    expect(hiddenCount).toBe(3);
  });

  it('hiddenCount + visible always equals the full length', () => {
    const word = 'A'.repeat(14);
    const { chars, hiddenCount } = craneBeamBricks(word);
    expect(chars.length + hiddenCount).toBe(word.length);
  });
});

describe('craneBeamTilePx — bricks shrink so the full word fits the bay', () => {
  it('keeps the comfy max size while the girder still fits the width budget', () => {
    expect(craneBeamTilePx(1)).toBe(CRANE_BEAM_TILE_MAX_PX);
    expect(craneBeamTilePx(3)).toBe(CRANE_BEAM_TILE_MAX_PX);
    expect(craneBeamTilePx(5)).toBe(CRANE_BEAM_TILE_MAX_PX);
  });

  it('shrinks monotonically once the word outgrows the budget', () => {
    expect(craneBeamTilePx(10)).toBeLessThan(craneBeamTilePx(8));
    expect(craneBeamTilePx(8)).toBeLessThan(craneBeamTilePx(5));
  });

  it('never widens the girder past the budget', () => {
    for (let n = 1; n <= CRANE_BEAM_MAX_BRICKS; n++) {
      expect(n * craneBeamTilePx(n)).toBeLessThanOrEqual(CRANE_BEAM_BUDGET_PX + n);
    }
  });

  it('never returns an illegibly small or oversized brick', () => {
    for (let n = 0; n <= 20; n++) {
      const px = craneBeamTilePx(n);
      expect(px).toBeGreaterThanOrEqual(CRANE_BEAM_TILE_MIN_PX);
      expect(px).toBeLessThanOrEqual(CRANE_BEAM_TILE_MAX_PX);
    }
  });
});
