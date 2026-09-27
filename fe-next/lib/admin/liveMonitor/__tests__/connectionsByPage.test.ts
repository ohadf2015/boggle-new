import { describe, it, expect } from 'vitest';
import {
  summarizeConnectionsByPage,
  UNKNOWN_CONNECTION_PAGE,
} from '../connectionsByPage';

describe('summarizeConnectionsByPage', () => {
  it('returns an empty array when there are no connections', () => {
    expect(summarizeConnectionsByPage([])).toEqual([]);
  });

  it('groups connections by their reported page and counts them', () => {
    const result = summarizeConnectionsByPage([
      '/multiplayer',
      '/multiplayer',
      '/profile',
    ]);
    expect(result).toEqual([
      { path: '/multiplayer', count: 2 },
      { path: '/profile', count: 1 },
    ]);
  });

  it('sorts by descending count so the busiest page is first', () => {
    const result = summarizeConnectionsByPage([
      '/daily',
      '/multiplayer',
      '/multiplayer',
      '/multiplayer',
      '/daily',
    ]);
    expect(result[0]).toEqual({ path: '/multiplayer', count: 3 });
    expect(result[1]).toEqual({ path: '/daily', count: 2 });
  });

  it('normalizes locale prefixes and dynamic ids so pages group together', () => {
    const result = summarizeConnectionsByPage([
      '/he/multiplayer',
      '/en/multiplayer',
      '/profile/8f3c1a2b9d4e?tab=stats',
      '/profile/0011223344aa',
    ]);
    const mp = result.find((g) => g.path === '/multiplayer');
    const profile = result.find((g) => g.path === '/profile/:id');
    expect(mp?.count).toBe(2);
    expect(profile?.count).toBe(2);
  });

  it('buckets sockets that never reported a page as unknown', () => {
    const result = summarizeConnectionsByPage([null, undefined, '', '/daily']);
    const unknown = result.find((g) => g.path === UNKNOWN_CONNECTION_PAGE);
    expect(unknown?.count).toBe(3);
    expect(result.find((g) => g.path === '/daily')?.count).toBe(1);
  });
});
