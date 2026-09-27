import { describe, it, expect } from 'vitest';
import {
  getMpInGameContainerClass,
  getMpInGamePlaceholderClass,
} from '../inGameContainerClass';

/**
 * Regression guard for the native-app "fanfare flashes white" bug.
 *
 * The MP in-game container used `bg-neo-cream dark:bg-neo-navy` +
 * `transition-colors`. The app is dark-only, so the cream variant only ever
 * painted as a 1-frame FOUC before the `dark` class resolved — and the
 * transition animated that cream→navy curtain into a visible wash that bled
 * through the semi-transparent (`bg-neo-navy/60`) pre-game countdown overlay.
 * The container must be navy from the first paint, with no color transition.
 */
describe('getMpInGameContainerClass', () => {
  for (const gameMode of ['classic', 'blast', 'wheel', 'word-hunt']) {
    describe(`gameMode="${gameMode}"`, () => {
      const cls = getMpInGameContainerClass(gameMode);

      it('is navy from the first paint', () => {
        expect(cls).toContain('bg-neo-navy');
      });

      it('never paints cream (no FOUC frame)', () => {
        expect(cls).not.toContain('bg-neo-cream');
      });

      it('has no color transition that could animate a flash', () => {
        expect(cls).not.toContain('transition-colors');
      });
    });
  }

  it('keeps zero padding for blast (full-bleed board)', () => {
    expect(getMpInGameContainerClass('blast')).toContain('p-0');
  });
});

describe('getMpInGamePlaceholderClass', () => {
  const cls = getMpInGamePlaceholderClass();

  it('is navy, never cream', () => {
    expect(cls).toContain('bg-neo-navy');
    expect(cls).not.toContain('bg-neo-cream');
  });
});
