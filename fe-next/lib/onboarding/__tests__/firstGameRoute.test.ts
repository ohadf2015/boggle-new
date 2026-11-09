/**
 * Where a brand-new player lands the moment onboarding ends.
 *
 * It used to be `/practice/classic?play=1` — the cozy practice hub's mode route.
 * Measured over 90 days on www.lexiclash.live: 299 people started practice and
 * **151 of them (50.5%) never played a real game at all**. Practice was a
 * terminal destination for half the people it caught, so FTUE now hands players
 * straight to the real engine.
 *
 * It now hands them a Quick Play classic round that starts from the link.
 *
 * This lives in one function because OnboardingFlow reaches "onboarding done"
 * from three separate handlers, and three paths to one outcome that each build
 * their own destination is Class 3 in .claude/rules/60-recurring-pitfalls.md.
 */

import { describe, it, expect } from 'vitest';
import { firstGameRoute } from '../firstGameRoute';

describe('firstGameRoute', () => {
  it('sends a new player into a real auto-started game', () => {
    expect(firstGameRoute('en')).toBe('/en/quick-play?mode=classic&coach=1');
  });

  it('keeps the player in their own language', () => {
    expect(firstGameRoute('he')).toBe('/he/quick-play?mode=classic&coach=1');
    expect(firstGameRoute('ja')).toBe('/ja/quick-play?mode=classic&coach=1');
  });

  it('never routes into practice', () => {
    for (const lang of ['en', 'he', 'sv', 'ja', 'es', 'ru']) {
      expect(firstGameRoute(lang)).not.toContain('/practice');
    }
  });
});
