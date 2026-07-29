import { describe, it, expect } from 'vitest';
import { normalizePagePath } from '../normalizePagePath';

describe('normalizePagePath', () => {
  it('strips a 2-letter locale prefix', () => {
    expect(normalizePagePath('/he/play')).toBe('/play');
    expect(normalizePagePath('/en/lobby')).toBe('/lobby');
  });

  it('treats locale-only path as home', () => {
    expect(normalizePagePath('/he')).toBe('/');
    expect(normalizePagePath('/en/')).toBe('/');
  });

  it('treats root as home', () => {
    expect(normalizePagePath('/')).toBe('/');
    expect(normalizePagePath('')).toBe('/');
  });

  it('keeps non-locale first segments intact', () => {
    expect(normalizePagePath('/play')).toBe('/play');
    expect(normalizePagePath('/lobby')).toBe('/lobby');
  });

  it('collapses high-cardinality id segments to a placeholder', () => {
    expect(normalizePagePath('/he/admin/players/abc-123-def')).toBe('/admin/players/:id');
    expect(normalizePagePath('/profile/9f8e7d6c5b4a')).toBe('/profile/:id');
  });

  it('does not collapse short readable slugs', () => {
    expect(normalizePagePath('/en/words/cat')).toBe('/words/cat');
  });

  it('strips query string and hash', () => {
    expect(normalizePagePath('/en/play?locale=en#top')).toBe('/play');
  });

  it('drops trailing slash', () => {
    expect(normalizePagePath('/en/lobby/')).toBe('/lobby');
  });
});
