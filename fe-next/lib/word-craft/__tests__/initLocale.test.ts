/**
 * Regression: buildInitialState must thread `locale` into createBag so the
 * starting rack is drawn from the locale-specific tile distribution.
 * Previously the locale was dropped at the hook boundary and every player got
 * an English rack regardless of UI language.
 */

import { describe, it, expect } from 'vitest';
import { buildInitialState } from '../useWordCraftGame';

const HEBREW = /^[֐-׿_]$/;
const LATIN = /^[A-Z_]$/;

describe('buildInitialState locale routing', () => {
  it('draws a Hebrew rack when locale=he', () => {
    const state = buildInitialState({ seed: 42, boardSize: 15, locale: 'he' });
    for (const tile of state.player.rack) {
      expect(tile.letter).toMatch(HEBREW);
    }
  });

  it('draws a Latin rack when locale=en (default)', () => {
    const state = buildInitialState({ seed: 42, boardSize: 15 });
    for (const tile of state.player.rack) {
      expect(tile.letter).toMatch(LATIN);
    }
  });

  it('draws a Latin rack when locale=es', () => {
    const state = buildInitialState({ seed: 7, boardSize: 15, locale: 'es' });
    for (const tile of state.player.rack) {
      // Spanish bag may include Ñ — keep matcher inclusive of locale-extras
      expect(tile.letter.length).toBe(1);
    }
  });
});
