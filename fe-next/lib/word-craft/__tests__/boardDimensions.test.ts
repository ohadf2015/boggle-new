import { describe, expect, it } from 'vitest';
import { getBoardDims, PHONE_BREAKPOINT_PX } from '../boardDimensions';

describe('getBoardDims', () => {
  it('returns 11x11 for phone-class viewport (< 768px)', () => {
    expect(getBoardDims(360)).toEqual({ size: 11, bagSize: 78 });
    expect(getBoardDims(767)).toEqual({ size: 11, bagSize: 78 });
  });

  it('returns 13x13 for tablet+ viewport (>= 768px)', () => {
    expect(getBoardDims(768)).toEqual({ size: 13, bagSize: 100 });
    expect(getBoardDims(1920)).toEqual({ size: 13, bagSize: 100 });
  });

  it('handles 0 / NaN / undefined defensively (defaults to phone)', () => {
    expect(getBoardDims(0)).toEqual({ size: 11, bagSize: 78 });
    expect(getBoardDims(Number.NaN)).toEqual({ size: 11, bagSize: 78 });
  });

  it('exports breakpoint constant', () => {
    expect(PHONE_BREAKPOINT_PX).toBe(768);
  });
});
