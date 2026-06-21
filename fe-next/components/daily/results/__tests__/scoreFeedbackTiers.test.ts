import { describe, it, expect } from 'vitest';
import {
  getScoreTier,
  SCORE_TIERS,
  type ScoreTierId,
} from '../scoreFeedbackTiers';

describe('getScoreTier — praise keyed to score percentage, not attempts', () => {
  it('regression: 490/1000 (49%) is NOT the top tier', () => {
    // The bug: a sub-50% score showed "Magnifikt!" (top praise).
    const tier = getScoreTier(490, 1000);
    expect(tier.id).not.toBe('legendary');
    expect(tier.id).toBe('rising');
  });

  it('maps each percentage band to the right tier', () => {
    expect(getScoreTier(0, 1000).id).toBe('budding'); // 0%
    expect(getScoreTier(290, 1000).id).toBe('budding'); // 29%
    expect(getScoreTier(300, 1000).id).toBe('rising'); // 30%
    expect(getScoreTier(499, 1000).id).toBe('rising'); // 49.9%
    expect(getScoreTier(500, 1000).id).toBe('solid'); // 50%
    expect(getScoreTier(699, 1000).id).toBe('solid'); // 69.9%
    expect(getScoreTier(700, 1000).id).toBe('stellar'); // 70%
    expect(getScoreTier(899, 1000).id).toBe('stellar'); // 89.9%
    expect(getScoreTier(900, 1000).id).toBe('legendary'); // 90%
    expect(getScoreTier(1000, 1000).id).toBe('legendary'); // 100%
  });

  it('only reaches "legendary" at 90%+', () => {
    expect(getScoreTier(899, 1000).id).toBe('stellar');
    expect(getScoreTier(900, 1000).id).toBe('legendary');
  });

  it('clamps overflow scores to the top tier without exceeding it', () => {
    expect(getScoreTier(1500, 1000).id).toBe('legendary');
  });

  it('guards a zero/negative maxScore without dividing by zero', () => {
    const tier = getScoreTier(50, 0);
    expect(tier.id).toBe('budding');
    expect(Number.isFinite(tier.minPercent)).toBe(true);
  });

  it('treats negative scores as the lowest tier', () => {
    expect(getScoreTier(-100, 1000).id).toBe('budding');
  });

  it('returns a translation key, a neo color token, gradient and glow for the badge theme', () => {
    const tier = getScoreTier(950, 1000);
    expect(tier.key).toBe('wordHunt.results.scoreTierLegendary');
    expect(tier.color).toBe('neo-cyan');
    expect(tier.gradient).toMatch(/from-/);
    expect(tier.glow).toMatch(/rgba\(/);
  });

  it('escalates color theme cold→hot as the score climbs', () => {
    expect(getScoreTier(100, 1000).color).toBe('neo-pink'); // budding
    expect(getScoreTier(400, 1000).color).toBe('neo-orange'); // rising
    expect(getScoreTier(600, 1000).color).toBe('neo-yellow'); // solid
    expect(getScoreTier(800, 1000).color).toBe('neo-lime'); // stellar
    expect(getScoreTier(950, 1000).color).toBe('neo-cyan'); // legendary
  });
});

describe('SCORE_TIERS — table integrity', () => {
  it('defines exactly five tiers, ordered high→low by threshold', () => {
    expect(SCORE_TIERS).toHaveLength(5);
    const thresholds = SCORE_TIERS.map((t) => t.minPercent);
    const sorted = [...thresholds].sort((a, b) => b - a);
    expect(thresholds).toEqual(sorted);
  });

  it('every tier key follows the wordHunt.results.scoreTier* convention', () => {
    const ids: ScoreTierId[] = ['budding', 'rising', 'solid', 'stellar', 'legendary'];
    for (const tier of SCORE_TIERS) {
      expect(ids).toContain(tier.id);
      expect(tier.key).toMatch(/^wordHunt\.results\.scoreTier/);
    }
  });
});
