/**
 * Win/loss/draw and achievement-tier colour used to be raw Tailwind palette
 * (`bg-green-500`, `text-amber-700`, …) hand-rolled at four separate call
 * sites (student profile duel history, DuelGameView, DuelHistory,
 * AchievementProgressCard). This is the single neo-token source of truth so
 * the palette can't drift a fifth time.
 */

import { describe, it, expect } from 'vitest';
import { outcomeTone, achievementTierTone } from '../outcomeTone';

describe('outcomeTone', () => {
  it('maps win to lime', () => {
    const tone = outcomeTone('win');
    expect(tone.badge).toContain('neo-lime');
    expect(tone.text).toContain('neo-lime');
    expect(tone.soft).toContain('neo-lime');
  });

  it('maps loss to red', () => {
    const tone = outcomeTone('loss');
    expect(tone.badge).toContain('neo-red');
    expect(tone.text).toContain('neo-red');
    expect(tone.soft).toContain('neo-red');
  });

  it('maps draw to muted cream', () => {
    const tone = outcomeTone('draw');
    expect(tone.badge).toContain('neo-cream');
    expect(tone.text).toContain('neo-cream');
    expect(tone.soft).toContain('neo-cream');
  });

  it('never returns raw Tailwind palette classes', () => {
    for (const outcome of ['win', 'loss', 'draw'] as const) {
      const tone = outcomeTone(outcome);
      for (const cls of [tone.badge, tone.text, tone.soft]) {
        expect(cls).not.toMatch(/\b(green|red-5|gray|amber|slate|yellow-5|cyan-4)-\d00\b/);
      }
    }
  });
});

describe('achievementTierTone', () => {
  it('covers all four tiers with ink-contrast-safe classes', () => {
    const tiers = ['bronze', 'silver', 'gold', 'platinum'] as const;
    for (const tier of tiers) {
      const tone = achievementTierTone(tier);
      expect(tone.badge).toBeTruthy();
      expect(tone.text).toBeTruthy();
      expect(tone.ink).toBeTruthy();
    }
  });

  it('maps bronze to orange family', () => {
    expect(achievementTierTone('bronze').badge).toContain('neo-orange');
  });

  it('maps silver to cream family', () => {
    expect(achievementTierTone('silver').badge).toContain('neo-cream');
  });

  it('maps gold to yellow family', () => {
    expect(achievementTierTone('gold').badge).toContain('neo-yellow');
  });

  it('maps platinum to cyan family', () => {
    expect(achievementTierTone('platinum').badge).toContain('neo-cyan');
  });
});
