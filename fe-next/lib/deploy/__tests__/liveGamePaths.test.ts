import { describe, it, expect } from 'vitest';
import { isLiveGamePath, LIVE_GAME_SURFACES } from '../liveGamePaths';

describe('isLiveGamePath', () => {
  it.each([
    '/en/multiplayer',
    '/he/multiplayer?room=AB12&classroom=true',
    '/ja/education/live',
    '/sv/education/live/host',
    '/es/education/duels',
    '/ru/education/duels/abc#x',
    '/multiplayer',
  ])('treats %s as a live game session', (path) => {
    expect(isLiveGamePath(path)).toBe(true);
  });

  it.each([
    '/en',
    '/en/blast',
    '/en/education',
    '/en/education/classroom-game',
    '/en/education/livestream',
    '/en/multiplayer-guide',
    '/en/student',
    '',
    undefined,
  ])('treats %s as safe to reload', (path) => {
    expect(isLiveGamePath(path)).toBe(false);
  });

  it('lists each live surface by its route segments after the locale', () => {
    expect(LIVE_GAME_SURFACES).toEqual(['multiplayer', 'education/live', 'education/duels']);
  });
});
