import { describe, it, expect } from 'vitest';
import { pickHqUpsell } from '../pickHqUpsell';

describe('pickHqUpsell — Teacher HQ shows at most ONE upsell', () => {
  it('Given nothing to sell, Then only the plan badge may carry its quiet Upgrade word', () => {
    expect(pickHqUpsell({ hasBanner: false, pinBanner: false, hasUsagePrompt: false })).toEqual({
      pinned: false,
      chip: null,
      planUpgradeWord: true,
    });
  });

  it('Given a pinned trial banner, Then it is the only ask: no chip, no Upgrade word, usage prompt dropped', () => {
    expect(pickHqUpsell({ hasBanner: true, pinBanner: true, hasUsagePrompt: true })).toEqual({
      pinned: true,
      chip: null,
      planUpgradeWord: false,
    });
  });

  it('Given a chip banner AND a usage prompt, Then the chip carries the banner alone', () => {
    expect(pickHqUpsell({ hasBanner: true, pinBanner: false, hasUsagePrompt: true })).toEqual({
      pinned: false,
      chip: 'banner',
      planUpgradeWord: false,
    });
  });

  it('Given only a usage prompt, Then the chip carries it and the badge goes quiet', () => {
    expect(pickHqUpsell({ hasBanner: false, pinBanner: false, hasUsagePrompt: true })).toEqual({
      pinned: false,
      chip: 'usage',
      planUpgradeWord: false,
    });
  });

  it('Given pinBanner without a banner node, Then nothing is pinned', () => {
    expect(pickHqUpsell({ hasBanner: false, pinBanner: true, hasUsagePrompt: false }).pinned).toBe(false);
  });
});
