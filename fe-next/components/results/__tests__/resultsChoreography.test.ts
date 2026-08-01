import { describe, it, expect } from 'vitest';
import { REVEAL_DELAYS } from '../ResultsPodium';
import { HIGHLIGHTS_REVEAL_DELAY } from '../HighlightsBar';

/**
 * The MP results screen reads top-to-bottom: who you are → where everyone
 * placed → what you did well. Before this, the hero (0.1–0.45s) and the podium
 * (0.1–0.35s) animated on top of each other, so the whole upper half arrived as
 * one simultaneous burst and HighlightsBar straggled in alone afterwards.
 *
 * These assert the ORDER, not the exact values — retiming is fine, overlapping
 * the beats back into a burst is not.
 */

// Last hero beat (the placement badge). Mirrors ResultsHeroSection.
const HERO_LAST_BEAT = 0.45;

describe('MP results entrance choreography', () => {
  it('starts the podium only after the hero has finished landing', () => {
    expect(Math.min(...REVEAL_DELAYS)).toBeGreaterThanOrEqual(HERO_LAST_BEAT);
  });

  it('reveals the winner last for the drama beat', () => {
    const [second, first, third] = REVEAL_DELAYS;
    expect(first).toBeGreaterThan(second);
    expect(first).toBeGreaterThan(third);
  });

  it('brings in the highlights after the winner, not on top of them', () => {
    expect(HIGHLIGHTS_REVEAL_DELAY).toBeGreaterThan(Math.max(...REVEAL_DELAYS));
  });

  it('keeps the whole sequence short enough to not feel sluggish', () => {
    // A results screen that takes over ~1.2s to settle reads as laggy, not
    // cinematic — especially between rapid multiplayer rounds.
    expect(HIGHLIGHTS_REVEAL_DELAY).toBeLessThanOrEqual(1.2);
  });
});
