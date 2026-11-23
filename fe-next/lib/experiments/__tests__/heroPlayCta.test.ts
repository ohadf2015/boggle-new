import { describe, expect, it } from 'vitest';
import { heroPrimaryIsSolo, HERO_PLAY_CTA_KEY } from '../heroPlayCta';
import { en } from '@/translations/en';

describe('hero play CTA experiment', () => {
  it('keeps the friends button for control, no flag and unknown variants', () => {
    expect(heroPrimaryIsSolo(null)).toBe(false);
    expect(heroPrimaryIsSolo('control')).toBe(false);
    expect(heroPrimaryIsSolo('other')).toBe(false);
  });
  it('makes the primary solo for treatment, and the copy exists', () => {
    expect(heroPrimaryIsSolo('treatment')).toBe(true);
    const hp = (en as unknown as { homePlay: Record<string, string> }).homePlay;
    expect(hp.playNow).toBe('Play now');
    expect(hp.playNowSub).toMatch(/no sign-up/);
    expect(HERO_PLAY_CTA_KEY).toBe('lexiclash-hero-play-cta');
  });
});
