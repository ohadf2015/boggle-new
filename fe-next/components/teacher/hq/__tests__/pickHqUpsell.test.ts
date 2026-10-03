import { describe, it, expect } from 'vitest';
import { pickHqUpsell } from '../pickHqUpsell';

describe('pickHqUpsell — Teacher HQ shows at most ONE upsell', () => {
  it('Given nothing to sell, Then only the plan badge may carry its quiet Upgrade word', () => {
    expect(pickHqUpsell({ hasBanner: false, pinBanner: false, hasUsagePrompt: false })).toEqual({
      pinned: false,
      chip: null,
      chipVisible: false,
      pulse: false,
      planUpgradeWord: true,
    });
  });

  it('Given a pinned trial banner, Then it is the only ask: no chip, no Upgrade word, usage prompt dropped', () => {
    expect(pickHqUpsell({ hasBanner: true, pinBanner: true, hasUsagePrompt: true })).toEqual({
      pinned: true,
      chip: null,
      chipVisible: false,
      pulse: false,
      planUpgradeWord: false,
    });
  });

  it('Given a chip banner AND a usage prompt, Then the chip carries the banner alone', () => {
    expect(pickHqUpsell({ hasBanner: true, pinBanner: false, hasUsagePrompt: true })).toEqual({
      pinned: false,
      chip: 'banner',
      chipVisible: true,
      pulse: false,
      planUpgradeWord: false,
    });
  });

  it('Given only a usage prompt, Then the chip carries it and the badge goes quiet', () => {
    expect(pickHqUpsell({ hasBanner: false, pinBanner: false, hasUsagePrompt: true })).toEqual({
      pinned: false,
      chip: 'usage',
      chipVisible: true,
      pulse: false,
      planUpgradeWord: false,
    });
  });

  it('Given pinBanner without a banner node, Then nothing is pinned', () => {
    expect(pickHqUpsell({ hasBanner: false, pinBanner: true, hasUsagePrompt: false }).pinned).toBe(false);
  });

  describe('a free teacher whose class pulse is on screen', () => {
    const free = { hasPro: false, pulseHome: true };

    it('Given a chip banner, Then the pulse carries the ONE ask and opens that banner; the chip and badge word stand down', () => {
      expect(pickHqUpsell({ hasBanner: true, pinBanner: false, hasUsagePrompt: false, ...free })).toEqual({
        pinned: false,
        chip: 'banner',
        chipVisible: false,
        pulse: true,
        planUpgradeWord: false,
      });
    });

    it('Given nothing else to sell, Then the pulse still carries the one contextual ask instead of the badge word', () => {
      expect(pickHqUpsell({ hasBanner: false, pinBanner: false, hasUsagePrompt: false, ...free })).toEqual({
        pinned: false,
        chip: null,
        chipVisible: false,
        pulse: true,
        planUpgradeWord: false,
      });
    });

    it('Given a pinned trial banner, Then the banner still wins over the pulse', () => {
      const r = pickHqUpsell({ hasBanner: true, pinBanner: true, hasUsagePrompt: false, ...free });
      expect(r.pinned).toBe(true);
      expect(r.pulse).toBe(false);
      expect(r.chipVisible).toBe(false);
    });

    it('Given the class data still loading, Then no ask shows yet (no chip that a late pulse would replace)', () => {
      expect(pickHqUpsell({ hasBanner: true, pinBanner: false, hasUsagePrompt: false, hasPro: false, pulseHome: null })).toEqual({
        pinned: false,
        chip: 'banner',
        chipVisible: false,
        pulse: false,
        planUpgradeWord: false,
      });
    });

    it('Given a Pro teacher, Then the pulse never sells', () => {
      expect(pickHqUpsell({ hasBanner: false, pinBanner: false, hasUsagePrompt: false, hasPro: true, pulseHome: true }).pulse).toBe(false);
    });
  });

  it.each([
    [true, true, true, true, false],
    [true, false, true, false, true],
    [false, false, true, false, null],
    [false, false, false, true, false],
  ])('Given banner=%s pin=%s usage=%s pro=%s pulseHome=%s, Then at most one ask is visible', (hasBanner, pinBanner, hasUsagePrompt, hasPro, pulseHome) => {
    const r = pickHqUpsell({ hasBanner, pinBanner, hasUsagePrompt, hasPro, pulseHome });
    expect([r.pinned, r.chipVisible, r.pulse, r.planUpgradeWord].filter(Boolean).length).toBeLessThanOrEqual(1);
  });
});
