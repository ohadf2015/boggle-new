/**
 * computeFailReason — turns the bare clearPct + tile counts into a specific,
 * actionable diagnostic for the wave-fail card.
 *
 * Sprint 1 clarity guard: replaces "Game Over" with concrete shortfall
 * ("Just 4 tiles short!"). All 3 LLM critiques flagged generic failure copy
 * as a top frustration source.
 */
import { computeFailReason } from '../computeFailReason';

describe('computeFailReason', () => {
  it('returns tiles_short with positive delta when below 90%', () => {
    const r = computeFailReason({ tilesCleared: 30, totalTiles: 36 });
    // 36 * 0.9 = 32.4 → ceil = 33, missed by 33 - 30 = 3
    expect(r.kind).toBe('tiles_short');
    expect(r.tilesShort).toBe(3);
  });

  it('returns met when clearPct >= 90%', () => {
    const r = computeFailReason({ tilesCleared: 33, totalTiles: 36 });
    expect(r.kind).toBe('met');
    expect(r.tilesShort).toBe(0);
  });

  it('handles zero tiles edge case', () => {
    const r = computeFailReason({ tilesCleared: 0, totalTiles: 0 });
    expect(r.kind).toBe('met');
    expect(r.tilesShort).toBe(0);
  });

  it('clamps negative shortfall', () => {
    const r = computeFailReason({ tilesCleared: 100, totalTiles: 36 });
    expect(r.kind).toBe('met');
    expect(r.tilesShort).toBe(0);
  });
});
