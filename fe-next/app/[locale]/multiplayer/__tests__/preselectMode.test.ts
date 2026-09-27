/**
 * `?mode=` deep-link preselect must write BOTH store fields:
 *  - `gameMode` (resolved gameplay mode)
 *  - `hostSelectedGameMode` (host INTENT — the field `startGame` actually reads)
 *
 * Regression: writing only `gameMode` left `hostSelectedGameMode` at its
 * 'random' default, so the host's startGame emit carried 'random' and the
 * backend silently rolled a random mode — dropping the deep-linked mode
 * (Word Hunt / Wheel Rush cross-promo cards). Class-1 dual-source-of-truth.
 */

import { describe, it, expect, vi } from 'vitest';
import { applyMpPreselectMode } from '../PageClient';

const makeActions = () => ({
  setGameMode: vi.fn(),
  setHostSelectedGameMode: vi.fn(),
});

describe('applyMpPreselectMode', () => {
  it('writes a valid deep-linked mode to BOTH gameMode and hostSelectedGameMode', () => {
    const actions = makeActions();
    applyMpPreselectMode('word-hunt', actions);
    expect(actions.setGameMode).toHaveBeenCalledWith('word-hunt');
    expect(actions.setHostSelectedGameMode).toHaveBeenCalledWith('word-hunt');
  });

  it('handles wheel-rush deep-link (the cross-promo card mode)', () => {
    const actions = makeActions();
    applyMpPreselectMode('wheel-rush', actions);
    expect(actions.setHostSelectedGameMode).toHaveBeenCalledWith('wheel-rush');
  });

  it('falls back to random gameMode when no/invalid mode, WITHOUT clobbering host intent', () => {
    const actions = makeActions();
    applyMpPreselectMode(null, actions);
    expect(actions.setGameMode).toHaveBeenCalledWith('random');
    // hostSelectedGameMode must NOT be reset — it persists host intent across rounds.
    expect(actions.setHostSelectedGameMode).not.toHaveBeenCalled();
  });
});
