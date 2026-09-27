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

  it('dailyInsightsPeers namespaces by mode AND date (one shared percentile pool per puzzle)', () => {
    expect(cacheKeys.dailyInsightsPeers('word_hunt', '2026-06-23')).toBe(
      'lc:next:daily:peers:word_hunt:2026-06-23'
    );
    // Different mode or different date must never collide
    expect(cacheKeys.dailyInsightsPeers('word_hunt', '2026-06-23')).not.toBe(
      cacheKeys.dailyInsightsPeers('word_hunt', '2026-06-24')
    );
    expect(cacheKeys.dailyInsightsPeers('word_hunt', '2026-06-23')).not.toBe(
      cacheKeys.dailyInsightsPeers('crossword', '2026-06-23')
    );
  });
});
