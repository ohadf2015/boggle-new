import { describe, expect, it } from 'vitest';
import { getBoardDims, PHONE_BREAKPOINT_PX } from '../boardDimensions';

describe('getBoardDims', () => {
  // Bags tightened (phone 78→54, tablet 100→70) so a SOLO game reaches a
  // satisfying finish in ~6-8 rounds instead of dragging to ~10+.
  it('returns 11x11 + tighter bag for phone-class viewport (< 768px)', () => {
    expect(getBoardDims(360)).toEqual({ size: 11, bagSize: 54 });
    expect(getBoardDims(767)).toEqual({ size: 11, bagSize: 54 });
  });

  it('returns 13x13 + tighter bag for tablet+ viewport (>= 768px)', () => {
    expect(getBoardDims(768)).toEqual({ size: 13, bagSize: 70 });
    expect(getBoardDims(1920)).toEqual({ size: 13, bagSize: 70 });
  });

  it('handles 0 / NaN / undefined defensively (defaults to phone)', () => {
    expect(getBoardDims(0)).toEqual({ size: 11, bagSize: 54 });
    expect(getBoardDims(Number.NaN)).toEqual({ size: 11, bagSize: 54 });
  });

  it('exports breakpoint constant', () => {
    expect(PHONE_BREAKPOINT_PX).toBe(768);
  });
});
