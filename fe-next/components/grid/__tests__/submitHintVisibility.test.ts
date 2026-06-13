/**
 * The desktop "double-click last letter to submit" hint must only show when a
 * player is building a word by clicking tile-by-tile (click-select) on a mouse
 * device with at least 2 letters down — i.e. when re-clicking/double-clicking
 * the last tile is the actual submit gesture. On touch the last-tap auto-submits
 * so the hint would be wrong; on drag there's no need for it.
 */
import { describe, it, expect } from 'vitest';
import { shouldShowDoubleClickSubmitHint } from '../submitHintVisibility';

describe('shouldShowDoubleClickSubmitHint', () => {
  it('shows on desktop while click-selecting with 2+ letters', () => {
    expect(shouldShowDoubleClickSubmitHint({ canHover: true, isClickSelecting: true, selectedCount: 2 })).toBe(true);
    expect(shouldShowDoubleClickSubmitHint({ canHover: true, isClickSelecting: true, selectedCount: 5 })).toBe(true);
  });

  it('hides on touch devices (no hover)', () => {
    expect(shouldShowDoubleClickSubmitHint({ canHover: false, isClickSelecting: true, selectedCount: 3 })).toBe(false);
  });

  it('hides when not in click-select mode (e.g. dragging)', () => {
    expect(shouldShowDoubleClickSubmitHint({ canHover: true, isClickSelecting: false, selectedCount: 3 })).toBe(false);
  });

  it('hides with fewer than 2 letters (double-click submit needs 2+)', () => {
    expect(shouldShowDoubleClickSubmitHint({ canHover: true, isClickSelecting: true, selectedCount: 1 })).toBe(false);
    expect(shouldShowDoubleClickSubmitHint({ canHover: true, isClickSelecting: true, selectedCount: 0 })).toBe(false);
  });
});
