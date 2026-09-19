import { describe, it, expect } from 'vitest';
import { normalizePagePath } from '../normalizePagePath';

describe('normalizePagePath', () => {
  it('strips a 2-letter locale prefix', () => {
    expect(normalizePagePath('/he/play')).toBe('/play');
    expect(normalizePagePath('/en/lobby')).toBe('/lobby');
    expect(normalizePagePath('/ru/play')).toBe('/play');
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

  // Regression: the length-only rule turned most of the site into `/:id`, so the
  // admin page panels showed the same handful of labels no matter what was browsed.
  it('keeps long readable routes and word slugs', () => {
    expect(normalizePagePath('/en/singleplayer')).toBe('/singleplayer');
    expect(normalizePagePath('/en/lexiclash-vs-wordle')).toBe('/lexiclash-vs-wordle');
    expect(normalizePagePath('/he/hebrew-multiplayer-word-game')).toBe(
      '/hebrew-multiplayer-word-game'
    );
    expect(normalizePagePath('/en/education/teacher-dashboard')).toBe(
      '/education/teacher-dashboard'
    );
    expect(normalizePagePath('/en/blog/i-waited-11-days')).toBe('/blog/i-waited-11-days');
    expect(normalizePagePath('/en/words/starting-with-q')).toBe('/words/starting-with-q');
  });

  it('still collapses ids that happen to contain hyphens', () => {
    expect(normalizePagePath('/en/join/room-a1b2c3d4')).toBe('/join/:id');
    expect(normalizePagePath('/en/custom/550e8400-e29b-41d4-a716-446655440000')).toBe(
      '/custom/:id'
    );
  });

  it('never leaks a username, however readable it looks', () => {
    expect(normalizePagePath('/en/u/somelongusername')).toBe('/u/:id');
    expect(normalizePagePath('/en/u/bob')).toBe('/u/:id');
    expect(normalizePagePath('/en/player/quickbrownfox')).toBe('/player/:id');
  });

  it('strips query string and hash', () => {
    expect(normalizePagePath('/en/play?locale=en#top')).toBe('/play');
  });

  it('drops trailing slash', () => {
    expect(normalizePagePath('/en/lobby/')).toBe('/lobby');
  });
});
