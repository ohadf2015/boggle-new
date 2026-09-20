/**
 * The victory ledger — the itemized win recap (STS's Floors/Enemies/Elites/
 * Boss/Money, each carrying its OWN point contribution to one final total).
 *
 * The counts are read off the act map the run actually walked (`map.nodes`
 * indexed by `run.path`), never off a second tally, so a reload cannot drift
 * from it.
 */
import { describe, it, expect } from 'vitest';
import { buildRunMap, MAP_ROWS, nodeId, type RunMap } from '@/lib/adventure/play/runMap';
import { LEDGER_PER, runLedger, walkedKinds, type LedgerKey } from '../ledger';

/** A hand-built map so the fixtures state their own node kinds. */
function mapOf(kinds: Array<[string, string]>): RunMap {
  return {
    world: 1,
    rows: MAP_ROWS,
    nodes: kinds.map(([id, kind], i) => ({ id, row: i, lane: 0, kind: kind as RunMap['nodes'][number]['kind'] })),
    edges: [],
  };
}

const WON_PATH: Array<[string, string]> = [
  ['a', 'fight'], ['b', 'fight'], ['c', 'treasure'], ['d', 'elite'],
  ['e', 'shop'], ['f', 'event'], ['g', 'rest'], ['h', 'boss'],
];

const base = {
  map: mapOf(WON_PATH),
  path: WON_PATH.map(([id]) => id),
  won: true,
  words: 12,
  bestWord: { word: 'STORM', pts: 30 },
  gold: 120,
  relics: ['storm-rune', 'long-bow'] as never,
  hp: 3,
  maxHp: 5,
};

const line = (l: { key: LedgerKey }[], key: LedgerKey) => l.find((x) => x.key === key);

describe('walkedKinds', () => {
  it('reads the kind of every node id in the path, in order', () => {
    expect(walkedKinds(base.map, ['a', 'd', 'h'])).toEqual(['fight', 'elite', 'boss']);
  });

  it('skips ids the map does not know and survives a null map', () => {
    expect(walkedKinds(base.map, ['a', 'nope'])).toEqual(['fight']);
    expect(walkedKinds(null, ['a'])).toEqual([]);
  });

  it('agrees with a real seeded act map', () => {
    const real = buildRunMap('seed-xyz', 1);
    const first = real.nodes.find((n) => n.row === 0)!;
    expect(walkedKinds(real, [first.id, nodeId(MAP_ROWS - 1, 0)])).toEqual([first.kind, 'boss']);
  });
});

describe('runLedger — a won run', () => {
  const led = runLedger(base);

  it('itemizes every beat the run actually walked, each with its own points', () => {
    expect(line(led.lines, 'enemies')).toMatchObject({ count: 2, per: LEDGER_PER.enemies, points: 2 * LEDGER_PER.enemies });
    expect(line(led.lines, 'elites')).toMatchObject({ count: 1, points: LEDGER_PER.elites });
    expect(line(led.lines, 'boss')).toMatchObject({ count: 1, points: LEDGER_PER.boss });
    expect(line(led.lines, 'nodes')).toMatchObject({ count: 8, points: 8 * LEDGER_PER.nodes });
    expect(line(led.lines, 'words')).toMatchObject({ count: 12, points: 12 * LEDGER_PER.words });
    expect(line(led.lines, 'relics')).toMatchObject({ count: 2, points: 2 * LEDGER_PER.relics });
  });

  it('scores the best word at its own board value and gold at a fraction', () => {
    expect(line(led.lines, 'bestWord')).toMatchObject({ count: 30, per: null, points: 30, word: 'STORM' });
    expect(line(led.lines, 'gold')).toMatchObject({ count: 120, per: null, points: Math.floor(120 / LEDGER_PER.goldPer) });
  });

  it('totals exactly the sum of its own lines — no hidden term', () => {
    expect(led.total).toBe(led.lines.reduce((n, l) => n + l.points, 0));
    expect(led.total).toBeGreaterThan(0);
  });

  it('pays a flawless bonus only on a full-health win', () => {
    expect(line(led.lines, 'flawless')).toBeUndefined();
    const perfect = runLedger({ ...base, hp: 5, maxHp: 5 });
    expect(line(perfect.lines, 'flawless')).toMatchObject({ count: 1, points: LEDGER_PER.flawless });
    expect(perfect.total).toBe(led.total + LEDGER_PER.flawless);
  });

  it('keeps the lines in a fixed reading order, spine first then bonuses', () => {
    expect(led.lines.map((l) => l.key)).toEqual([
      'nodes', 'enemies', 'elites', 'boss', 'words',
      'bestWord', 'treasure', 'events', 'gold', 'relics',
    ]);
  });

  it('splits the rows into the two columns the screen prints', () => {
    expect(led.spine.map((l) => l.key)).toEqual(['nodes', 'enemies', 'elites', 'boss', 'words']);
    expect(led.spine.every((l) => l.group === 'climb')).toBe(true);
    expect(led.bonus.every((l) => l.group === 'bonus')).toBe(true);
    expect([...led.spine, ...led.bonus]).toEqual(led.lines);
  });

  it('scores the chests opened and the unknowns braved on their own lines', () => {
    expect(line(led.lines, 'treasure')).toMatchObject({ count: 1, per: LEDGER_PER.treasure, points: LEDGER_PER.treasure });
    expect(line(led.lines, 'events')).toMatchObject({ count: 1, per: LEDGER_PER.events, points: LEDGER_PER.events });
  });
});

describe('runLedger — a run that ended badly', () => {
  it('does not credit the node the run died on', () => {
    const died = runLedger({ ...base, won: false, hp: 0 });
    expect(line(died.lines, 'boss')).toMatchObject({ count: 0, points: 0 });
    expect(line(died.lines, 'nodes')).toMatchObject({ count: 7 });
    expect(died.total).toBeLessThan(runLedger(base).total);
  });

  it('never pays flawless on a loss, even at full hearts', () => {
    expect(line(runLedger({ ...base, won: false, hp: 5, maxHp: 5 }).lines, 'flawless')).toBeUndefined();
  });

  /**
   * The bar prints `Beyond Elites Killed (0)  0` on its victory screen: the
   * spine of the climb is ALWAYS itemized, so the score reads as the sum of a
   * fixed payout sheet rather than as whatever happened to be non-zero. A
   * first-node death used to leave this screen with a single line on it.
   */
  it('still itemizes the whole climb when a run dies on its first node', () => {
    const empty = runLedger({ ...base, map: mapOf([['a', 'fight']]), path: ['a'], won: false, words: 0, bestWord: null, gold: 0, relics: [] as never });
    expect(empty.spine.map((l) => l.key)).toEqual(['nodes', 'enemies', 'elites', 'boss', 'words']);
    expect(empty.spine.every((l) => l.points === 0)).toBe(true);
    expect(empty.bonus).toEqual([]);
    expect(empty.total).toBe(0);
  });

  it('keeps an unearned BONUS off the sheet — only the spine shows its noughts', () => {
    const thin = runLedger({ ...base, map: mapOf([['a', 'fight']]), path: ['a'], won: false, words: 3, bestWord: null, gold: 0, relics: [] as never });
    expect(thin.bonus).toEqual([]);
    expect(line(thin.lines, 'words')).toMatchObject({ count: 3, points: 3 * LEDGER_PER.words });
  });

  it('survives junk on the wire without producing a NaN score', () => {
    const junk = runLedger({ ...base, words: Number.NaN, gold: -5, bestWord: { word: 'X', pts: Number.POSITIVE_INFINITY } });
    expect(Number.isFinite(junk.total)).toBe(true);
    expect(line(junk.lines, 'words')).toMatchObject({ count: 0, points: 0 });
    expect(line(junk.lines, 'gold')).toBeUndefined();
  });
});
