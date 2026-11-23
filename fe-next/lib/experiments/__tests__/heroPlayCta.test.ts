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

import { entryPlayNowHref } from '../heroPlayCta';

describe('entry pages under the hero CTA test', () => {
  it('maps listed SEO entry pages in any locale to the coached first game', () => {
    expect(entryPlayNowHref('/en/online-word-games-with-friends', 'en')).toBe('/en/quick-play?mode=classic&coach=1');
    expect(entryPlayNowHref('/es/juego-de-palabras-multijugador/', 'es')).toBe('/es/quick-play?mode=classic&coach=1');
  });
  it('sends the daily wheel landing page to today\'s wheel', () => {
    expect(entryPlayNowHref('/he/daily-word-wheel', 'he')).toBe('/he/daily/word-wheel');
  });
  it('leaves every other page alone, education included', () => {
    for (const p of ['/en', '/', '/en/multiplayer', '/en/education', '/en/teacher', '/en/education/classroom-game', '/he/daily/word-wheel', null]) {
      expect(entryPlayNowHref(p, 'en')).toBeNull();
    }
  });
});
