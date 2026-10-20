import { describe, it, expect } from 'vitest';
import { shouldShortenCoach } from '../searchCoachPolicy';

describe('shouldShortenCoach', () => {
  it('shortens a Google lander on ?autoStart=coach', () => {
    expect(shouldShortenCoach({
      referrer: 'https://www.google.com/search?q=word+game',
      autoStart: 'coach',
      isBareEntry: false,
    })).toBe(true);
  });

  it('shortens a Bing lander on bare /singleplayer', () => {
    expect(shouldShortenCoach({
      referrer: 'https://www.bing.com/search?q=boggle',
      autoStart: null,
      isBareEntry: true,
    })).toBe(true);
  });

  it('shortens a bare SEO hit whose referrer was stripped', () => {
    expect(shouldShortenCoach({
      referrer: '',
      autoStart: null,
      isBareEntry: true,
    })).toBe(true);
  });

  it('keeps the lesson for in-app onboarding (?autoStart=coach, no search referrer)', () => {
    expect(shouldShortenCoach({
      referrer: '',
      autoStart: 'coach',
      isBareEntry: false,
    })).toBe(false);
    expect(shouldShortenCoach({
      referrer: 'https://www.lexiclash.live/en',
      autoStart: 'coach',
      isBareEntry: false,
    })).toBe(false);
  });

  it('does not shorten bots or practice', () => {
    expect(shouldShortenCoach({
      referrer: 'https://www.google.com/',
      autoStart: 'bots',
      isBareEntry: false,
    })).toBe(false);
  });
});
