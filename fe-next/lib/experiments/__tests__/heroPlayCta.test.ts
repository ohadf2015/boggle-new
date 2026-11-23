import { describe, expect, it } from 'vitest';
import { heroPlayLabelKey, HERO_PLAY_CTA_KEY } from '../heroPlayCta';
import en from '../../../translations/en.js';

describe('hero play CTA experiment', () => {
  it('keeps today\'s label for control, no flag and unknown variants', () => {
    expect(heroPlayLabelKey(null)).toBe('homeFresh.hero.play');
    expect(heroPlayLabelKey('control')).toBe('homeFresh.hero.play');
    expect(heroPlayLabelKey('other')).toBe('homeFresh.hero.play');
  });
  it('shows the no-sign-up label for treatment, and the copy exists', () => {
    expect(heroPlayLabelKey('treatment')).toBe('homeFresh.hero.playNoSignup');
    expect((en as { homeFresh: { hero: Record<string, string> } }).homeFresh.hero.playNoSignup).toBe('Play free, no sign-up');
    expect(HERO_PLAY_CTA_KEY).toBe('lexiclash-hero-play-cta');
  });
});
