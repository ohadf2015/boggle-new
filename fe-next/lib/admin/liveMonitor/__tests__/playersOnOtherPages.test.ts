import { describe, it, expect } from 'vitest';
import { playersOnOtherPages, type PagePresenceEntry } from '../playersOnOtherPages';

const entry = (over: Partial<PagePresenceEntry>): PagePresenceEntry => ({
  sessionId: Math.random().toString(36).slice(2),
  path: '/',
  username: null,
  playerId: null,
  isAuthenticated: false,
  timestamp: Date.now(),
  ...over,
});

describe('playersOnOtherPages', () => {
  it('returns empty groups for no presence', () => {
    expect(playersOnOtherPages([], { gameUsernames: [], gamePlayerIds: [], spUsernames: [], spPlayerIds: [] })).toEqual([]);
  });

  it('groups anonymous landing visitors by page', () => {
    const result = playersOnOtherPages(
      [entry({ path: '/' }), entry({ path: '/' }), entry({ path: '/lobby' })],
      { gameUsernames: [], gamePlayerIds: [], spUsernames: [], spPlayerIds: [] },
    );
    const home = result.find((g) => g.path === '/');
    const lobby = result.find((g) => g.path === '/lobby');
    expect(home?.count).toBe(2);
    expect(lobby?.count).toBe(1);
  });

  it('excludes a presence whose username is already in a live game', () => {
    const result = playersOnOtherPages(
      [entry({ path: '/play', username: 'alice' })],
      { gameUsernames: ['alice'], gamePlayerIds: [], spUsernames: [], spPlayerIds: [] },
    );
    expect(result).toEqual([]);
  });

  it('excludes a presence whose playerId is already in a single-player session', () => {
    const result = playersOnOtherPages(
      [entry({ path: '/play', username: 'bob', playerId: 'uid-1', isAuthenticated: true })],
      { gameUsernames: [], gamePlayerIds: [], spUsernames: [], spPlayerIds: ['uid-1'] },
    );
    expect(result).toEqual([]);
  });

  it('keeps anonymous visitors even when same-named players are in games', () => {
    // anonymous (no username) never collides
    const result = playersOnOtherPages(
      [entry({ path: '/', username: null })],
      { gameUsernames: ['alice'], gamePlayerIds: [], spUsernames: [], spPlayerIds: [] },
    );
    expect(result[0]?.count).toBe(1);
  });

  it('sorts groups by count descending', () => {
    const result = playersOnOtherPages(
      [
        entry({ path: '/lobby' }),
        entry({ path: '/' }),
        entry({ path: '/' }),
        entry({ path: '/' }),
      ],
      { gameUsernames: [], gamePlayerIds: [], spUsernames: [], spPlayerIds: [] },
    );
    expect(result[0].path).toBe('/');
    expect(result[0].count).toBe(3);
  });

  it('includes identified visitors in the group sample', () => {
    const result = playersOnOtherPages(
      [entry({ path: '/lobby', username: 'carol', playerId: 'uid-9', isAuthenticated: true })],
      { gameUsernames: [], gamePlayerIds: [], spUsernames: [], spPlayerIds: [] },
    );
    expect(result[0].visitors[0]).toMatchObject({ username: 'carol', playerId: 'uid-9', isAuthenticated: true });
  });

  it('username match is case-insensitive', () => {
    const result = playersOnOtherPages(
      [entry({ path: '/play', username: 'Alice' })],
      { gameUsernames: ['alice'], gamePlayerIds: [], spUsernames: [], spPlayerIds: [] },
    );
    expect(result).toEqual([]);
  });
});
