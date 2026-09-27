import { describe, it, expect } from 'vitest';
import { isBoardInteractive } from '../boardInteractive';

/**
 * Single source of truth for "can the local player act on the board right now"
 * — shared by BOTH tile tap/drag (GridComponent `interactive`) and physical
 * keyboard typing (useKeyboardWordInput `enabled`). They used to be two separate
 * formulas; the keyboard one additionally required `gameActive`, so a player
 * could tap tiles but NOT type while `gameActive` lagged false. Keeping them on
 * one gate prevents that divergence.
 */
describe('isBoardInteractive', () => {
  it('is interactive during active play', () => {
    expect(isBoardInteractive({ isPlaying: true, showStartAnimation: false })).toBe(true);
  });

  it('is NOT interactive during the start/reveal animation', () => {
    expect(isBoardInteractive({ isPlaying: true, showStartAnimation: true })).toBe(false);
  });

  it('is NOT interactive when not playing (host broadcast / spectator)', () => {
    expect(isBoardInteractive({ isPlaying: false, showStartAnimation: false })).toBe(false);
    expect(isBoardInteractive({ isPlaying: false, showStartAnimation: true })).toBe(false);
  });

  it('does not depend on gameActive — tap and keyboard cannot diverge', () => {
    // Regression guard: keyboard typing must be enabled in exactly the same
    // states as tile selection. The gate takes no gameActive input at all.
    expect(isBoardInteractive({ isPlaying: true, showStartAnimation: false })).toBe(true);
  });
});
