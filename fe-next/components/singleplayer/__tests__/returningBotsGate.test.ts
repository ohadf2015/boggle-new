/**
 * Returning-player bots gate — SEO landers must not be yanked to MP.
 */
import { describe, it, expect } from 'vitest';
import {
  shouldRedirectReturningBots,
  isSearchEngineReferrer,
  BARE_SINGLEPLAYER_AUTOSTART,
} from '../returningBotsGate';

const stay = {
  hasPlayedBots: true,
  isBotsEntry: true,
  isBareEntry: false,
  referrer: '',
  alreadyRedirectedThisSession: false,
};

describe('shouldRedirectReturningBots', () => {
  it('redirects an in-app returning bots entry (FTUE ladder)', () => {
    expect(shouldRedirectReturningBots(stay)).toBe(true);
  });

  it('does not redirect first-timers', () => {
    expect(shouldRedirectReturningBots({ ...stay, hasPlayedBots: false })).toBe(false);
  });

  it('does not redirect bare /singleplayer (SEO/CTA) even with the bots flag', () => {
    expect(shouldRedirectReturningBots({ ...stay, isBareEntry: true })).toBe(false);
  });

  it('does not redirect Google/Bing landers on autoStart=bots', () => {
    expect(shouldRedirectReturningBots({
      ...stay,
      referrer: 'https://www.google.com/',
    })).toBe(false);
    expect(shouldRedirectReturningBots({
      ...stay,
      referrer: 'https://www.google.es/search?q=juego+palabras',
    })).toBe(false);
    expect(shouldRedirectReturningBots({
      ...stay,
      referrer: 'https://www.bing.com/search?q=word+game',
    })).toBe(false);
  });

  it('caps at one redirect per session (stops 7×/user churn)', () => {
    expect(shouldRedirectReturningBots({ ...stay, alreadyRedirectedThisSession: true })).toBe(false);
  });

  it('ignores non-bots entries', () => {
    expect(shouldRedirectReturningBots({ ...stay, isBotsEntry: false })).toBe(false);
  });
});

describe('isSearchEngineReferrer', () => {
  it('matches google country TLDs and bing', () => {
    expect(isSearchEngineReferrer('https://www.google.com/')).toBe(true);
    expect(isSearchEngineReferrer('https://www.google.co.il/')).toBe(true);
    expect(isSearchEngineReferrer('https://www.bing.com/search')).toBe(true);
    expect(isSearchEngineReferrer('https://www.lexiclash.live/es')).toBe(false);
    expect(isSearchEngineReferrer('')).toBe(false);
  });
});

describe('BARE_SINGLEPLAYER_AUTOSTART', () => {
  it('sends SEO landers into the coached first round, not bots', () => {
    expect(BARE_SINGLEPLAYER_AUTOSTART).toBe('coach');
  });
});
