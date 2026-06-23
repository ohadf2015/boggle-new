import { describe, it, expect } from 'vitest';
import { cacheKeys } from '@/lib/cache/cacheKeys';

describe('cacheKeys', () => {
  it('rankedTop50 is a single shared key (no per-user component → safe to serve every viewer)', () => {
    expect(cacheKeys.rankedTop50()).toBe('lc:next:lb:ranked:top50');
  });

  it('uses the lc:next: prefix so app-layer caches never collide with the backend lexiclash:v1: namespace', () => {
    expect(cacheKeys.rankedTop50().startsWith('lc:next:')).toBe(true);
    expect(cacheKeys.leagueStandings('x').startsWith('lc:next:')).toBe(true);
  });

  it('leagueStandings namespaces by leagueId so two leagues never share a cache entry', () => {
    expect(cacheKeys.leagueStandings('abc')).toBe('lc:next:lb:league:abc');
    expect(cacheKeys.leagueStandings('abc')).not.toBe(cacheKeys.leagueStandings('xyz'));
  });
});
