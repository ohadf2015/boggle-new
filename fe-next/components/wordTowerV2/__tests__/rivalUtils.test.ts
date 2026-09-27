import { describe, expect, it } from 'vitest';
import { greetingFor, plotLabel, rankStandings, rivalName, teaserTowers } from '../rivals/rivalUtils';
import type { RevengeEntry, RivalView } from '../useEstate';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);

const entry = (key: string, heightM: number) => ({ key, name: key, heightM, tower: [], rival: null });

describe('rival board standings', () => {
  it('given towers of different heights, when ranked, then the tallest is #1', () => {
    const out = rankStandings([entry('me', 12), entry('a', 41), entry('b', 24)]);
    expect(out.map((s) => s.key)).toEqual(['a', 'b', 'me']);
    expect(out.map((s) => s.rank)).toEqual([1, 2, 3]);
  });

  it('given a tie, when ranked, then the order they came in decides', () => {
    const out = rankStandings([entry('me', 20), entry('a', 20)]);
    expect(out.map((s) => s.key)).toEqual(['me', 'a']);
  });

  it('given only me, when ranked, then I am #1 and nothing throws', () => {
    expect(rankStandings([entry('me', 0)])).toEqual([{ ...entry('me', 0), rank: 1 }]);
  });
});

describe('rival labels', () => {
  it('given a rival with no display name, when named, then a friendly stand-in is used', () => {
    expect(rivalName({ displayName: '  ' } as RivalView, t)).toBe('wordTowerV2.rivals.someone');
    expect(rivalName(null, t)).toBe('wordTowerV2.rivals.someone');
  });

  it('given a raid that hit no plot, when labelled, then the empty-lot label is used', () => {
    expect(plotLabel(null, t)).toBe('wordTowerV2.rivals.plot.lot');
    expect(plotLabel('vault', t)).toBe('wordTowerV2.rivals.plot.vault');
  });

  it('given a plot the catalogue does not know, when labelled, then no raw key reaches the screen', () => {
    // A row written before a slot was renamed would otherwise render
    // "wordTowerV2.rivals.plot.cafe" verbatim in the grievance line.
    expect(plotLabel('cafe' as never, t)).toBe('wordTowerV2.rivals.plot.lot');
  });
});

const debt = (raidId: string): RevengeEntry =>
  ({ raidId, coinsStolen: 10, blocked: false, plot: null, createdAt: '', rival: {} as RivalView }) as RevengeEntry;

describe('payback greeting', () => {
  it('given a raid you have not seen, when you open the game, then their tower opens straight away', () => {
    expect(greetingFor([debt('r1')], 1, new Set())).toEqual({ kind: 'target', entry: debt('r1') });
  });

  it('given several attackers, when you open the game, then the list of who owes you opens', () => {
    expect(greetingFor([debt('r1'), debt('r2')], 2, new Set()).kind).toBe('list');
  });

  it('given every raid already seen, when you open the game, then nothing takes over the screen', () => {
    // The debt stays on the pill — glancing at the inbox must not shove you
    // into a raid you already waved off.
    expect(greetingFor([debt('r1')], 0, new Set()).kind).toBe('none');
  });

  it('given the greeting already fired for these raids, when it re-runs, then it stays quiet', () => {
    expect(greetingFor([debt('r1')], 1, new Set(['r1'])).kind).toBe('none');
  });

  it('given a NEW raid on top of ones already greeted, when it re-runs, then it fires again', () => {
    expect(greetingFor([debt('r1'), debt('r2')], 1, new Set(['r1'])).kind).toBe('list');
  });

  it('given nobody owes you anything, when you open the game, then nothing fires', () => {
    expect(greetingFor([], 3, new Set()).kind).toBe('none');
  });
});

describe('guest teaser', () => {
  it('given a guest, when the board is teased, then three towers of different heights are drawn', () => {
    const towers = teaserTowers();
    expect(towers).toHaveLength(3);
    expect(new Set(towers.map((x) => x.length)).size).toBe(3);
    // Bottom floor sits on the ground line every mini shares.
    expect(towers.every((x) => x[0].y === -60)).toBe(true);
  });
});
