import { describe, it, expect } from 'vitest';
import { filterGameGroups, parseShowFilter, parseModeFilter } from '../filterGroups';
import type { GameGroup } from '../groupGames';
import type { Engagement } from '../engagement';

function g(key: string, engagement: Engagement, typeBucket = 'singleplayer', isMultiplayer = false): GameGroup {
  return { key, engagement, typeBucket, isMultiplayer } as unknown as GameGroup;
}

const groups = [
  g('bot1', 'bot'),
  g('bot2', 'bot', 'wordTower'),
  g('np', 'never_played'),
  g('le', 'left_early', 'classic', true),
  g('fe', 'finished_empty', 'blast'),
  g('p1', 'played'),
  g('p2', 'played', 'wordTower'),
];

describe('filterGameGroups', () => {
  it('"people" (default) hides bots only', () => {
    const r = filterGameGroups(groups, { show: 'people', mode: 'all' });
    expect(r.groups.map((x) => x.key)).toEqual(['np', 'le', 'fe', 'p1', 'p2']);
  });

  it('"real" keeps only played games', () => {
    expect(filterGameGroups(groups, { show: 'real', mode: 'all' }).groups.map((x) => x.key)).toEqual(['p1', 'p2']);
  });

  it('"empty" keeps people games with nothing played', () => {
    expect(filterGameGroups(groups, { show: 'empty', mode: 'all' }).groups.map((x) => x.key)).toEqual(['np', 'le', 'fe']);
  });

  it('"bots" keeps only bots; "all" keeps everything', () => {
    expect(filterGameGroups(groups, { show: 'bots', mode: 'all' }).groups).toHaveLength(2);
    expect(filterGameGroups(groups, { show: 'all', mode: 'all' }).groups).toHaveLength(7);
  });

  it('mode narrows by type bucket; "multiplayer" by the MP flag', () => {
    expect(filterGameGroups(groups, { show: 'all', mode: 'wordTower' }).groups.map((x) => x.key)).toEqual(['bot2', 'p2']);
    expect(filterGameGroups(groups, { show: 'all', mode: 'multiplayer' }).groups.map((x) => x.key)).toEqual(['le']);
  });

  it('show counts follow the mode filter, not the show filter', () => {
    const r = filterGameGroups(groups, { show: 'real', mode: 'singleplayer' });
    expect(r.showCounts).toEqual({ all: 3, people: 2, real: 1, empty: 1, bots: 1 });
  });

  it('mode counts follow the show filter, not the mode filter', () => {
    const r = filterGameGroups(groups, { show: 'people', mode: 'blast' });
    expect(r.modeCounts.singleplayer).toBe(2);
    expect(r.modeCounts.wordTower).toBe(1);
    expect(r.modeCounts.multiplayer).toBe(1);
    expect(r.modeCounts.all).toBe(5);
  });
});

describe('param parsing', () => {
  it('defaults to people / all and rejects junk', () => {
    expect(parseShowFilter(null)).toBe('people');
    expect(parseShowFilter('nope')).toBe('people');
    expect(parseShowFilter('empty')).toBe('empty');
    expect(parseModeFilter(null)).toBe('all');
    expect(parseModeFilter('wordTower')).toBe('wordTower');
    expect(parseModeFilter('drop table')).toBe('all');
  });
});
