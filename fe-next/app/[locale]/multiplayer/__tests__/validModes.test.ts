/**
 * VALID_MODES is the client-side whitelist for `?mode=` deep-link preselect.
 * Must match the full GameMode union in shared/types/game.ts so wheel-rush deep-links work.
 */

import { describe, it, expect } from 'vitest';
import { VALID_MODES } from '../PageClient';

describe('multiplayer VALID_MODES', () => {
  it('includes every supported MP game mode', () => {
    expect(VALID_MODES).toEqual(
      expect.arrayContaining(['classic', 'blast', 'word-hunt', 'wheel-rush']),
    );
  });

  it('includes wheel-rush so ?mode=wheel-rush is not silently dropped', () => {
    expect(VALID_MODES).toContain('wheel-rush');
  });
});
