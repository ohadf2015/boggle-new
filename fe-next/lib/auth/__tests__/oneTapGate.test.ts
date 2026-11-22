import { describe, it, expect } from 'vitest';
import { isOneTapBlockedPath, oneTapMayPrompt } from '../oneTapGate';

describe('One Tap gate', () => {
  it.each([
    '/en/quick-play', '/he/blast', '/en/word-tower', '/en/crossword', '/en/word-craft',
    '/en/connections/daily', '/en/party', '/en/daily-word-wheel', '/en/multiplayer', '/sv/daily', '/en/brain',
  ])('Given a game page %s (menus and setup included), Then Google One Tap never opens there', (path) => {
    expect(isOneTapBlockedPath(path)).toBe(true);
  });

  it.each(['/en', '/en/quests', '/en/how-to-play', '/ru/word-of-the-day'])('Given a non-game page %s, Then One Tap may open', (path) => {
    expect(isOneTapBlockedPath(path)).toBe(false);
  });

  it('Given a phone with the cookie bar still up, Then One Tap waits (its iframe covers the bar buttons)', () => {
    expect(oneTapMayPrompt({ isPhone: true, consentDecided: false })).toBe(false);
    expect(oneTapMayPrompt({ isPhone: true, consentDecided: true })).toBe(true);
  });

  it('Given a desktop, Then One Tap does not wait for cookie consent (it sits top-right, clear of the bar)', () => {
    expect(oneTapMayPrompt({ isPhone: false, consentDecided: false })).toBe(true);
  });
});
