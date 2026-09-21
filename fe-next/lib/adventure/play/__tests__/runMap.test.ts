/**
 * Given a run seed, When the act map is built, Then it obeys the StS-like
 * shape rules and is deterministic.
 */
import { describe, it, expect } from 'vitest';
import {
  buildRunMap, reachableFrom, nodeById, nodeLevel, isPlayNode,
  MAP_ROWS, REST_ROW, BOSS_ROW, FIGHT_LEVEL_BY_ROW,
} from '../runMap';
import { WORLD_LEVELS, ELITE_LEVEL, BOSS_LEVEL } from '../levels';

const SEEDS = Array.from({ length: 40 }, (_, i) => `seed-${i}`);
const worlds = [1, 2, 5, 7, 10];
const maps = SEEDS.flatMap((s) => worlds.map((w) => buildRunMap(s, w)));

describe('buildRunMap', () => {
  it('Given the same seed and world, When built twice, Then the maps are identical', () => {
    expect(buildRunMap('abc', 3)).toEqual(buildRunMap('abc', 3));
  });

  it('Given two different seeds, When built, Then at least one map differs', () => {
    const a = JSON.stringify(buildRunMap('abc', 3));
    const b = JSON.stringify(buildRunMap('xyz', 3));
    expect(a).not.toBe(b);
  });

  it('Given any map, When inspected, Then it has 8 rows, each a single node or 3-4 lanes, and a single boss on top', () => {
    for (const m of maps) {
      expect(MAP_ROWS).toBe(8);
      expect(m.rows).toBe(MAP_ROWS);
      const byRow = (r: number) => m.nodes.filter((n) => n.row === r);
      for (let r = 0; r < BOSS_ROW; r++) {
        const n = byRow(r).length;
        expect(n === 1 || (n >= 3 && n <= 4)).toBe(true);
      }
      expect(byRow(BOSS_ROW)).toHaveLength(1);
      expect(byRow(BOSS_ROW)[0].kind).toBe('boss');
    }
  });

  it('Given any map, When a row offers only one kind of node, Then it is collapsed to a single node (no fake choice)', () => {
    for (const m of maps) {
      for (let r = 0; r < MAP_ROWS; r++) {
        const row = m.nodes.filter((n) => n.row === r);
        if (new Set(row.map((n) => n.kind)).size === 1) expect(row).toHaveLength(1);
      }
    }
  });

  it('Given any map, When row 0 and the rest row are read, Then each is a single node', () => {
    for (const m of maps) {
      expect(m.nodes.filter((n) => n.row === 0)).toHaveLength(1);
      expect(m.nodes.filter((n) => n.row === REST_ROW)).toHaveLength(1);
    }
  });

  it('Given any map, When row 0 is read, Then every node is a fight', () => {
    for (const m of maps) {
      expect(m.nodes.filter((n) => n.row === 0).every((n) => n.kind === 'fight')).toBe(true);
    }
  });

  it('Given any map, When the first two rows are read, Then no elite and no rest appear', () => {
    for (const m of maps) {
      const early = m.nodes.filter((n) => n.row <= 1);
      expect(early.some((n) => n.kind === 'elite' || n.kind === 'rest')).toBe(false);
    }
  });

  it('Given any map, When the row before the boss is read, Then every node is a rest', () => {
    for (const m of maps) {
      const rest = m.nodes.filter((n) => n.row === REST_ROW);
      expect(rest.length).toBeGreaterThan(0);
      expect(rest.every((n) => n.kind === 'rest')).toBe(true);
      expect(m.nodes.filter((n) => n.kind === 'rest' && n.row !== REST_ROW)).toHaveLength(0);
    }
  });

  it('Given any map, When kinds are counted, Then it holds at least one elite and one shop', () => {
    for (const m of maps) {
      expect(m.nodes.filter((n) => n.kind === 'elite').length).toBeGreaterThanOrEqual(1);
      expect(m.nodes.filter((n) => n.kind === 'shop').length).toBeGreaterThanOrEqual(1);
    }
  });

  it('Given any node below the boss, When its edges are read, Then it has 1-3 forward edges (a lone node fans out to the whole next row)', () => {
    for (const m of maps) {
      for (const n of m.nodes) {
        const out = m.edges.filter((e) => e.from === n.id);
        if (n.row === BOSS_ROW) { expect(out).toHaveLength(0); continue; }
        const rowWidth = m.nodes.filter((x) => x.row === n.row).length;
        const nextWidth = m.nodes.filter((x) => x.row === n.row + 1).length;
        expect(out.length).toBeGreaterThanOrEqual(1);
        if (rowWidth === 1) expect(out).toHaveLength(nextWidth);
        else expect(out.length).toBeLessThanOrEqual(3);
        for (const e of out) expect(nodeById(m, e.to)?.row).toBe(n.row + 1);
      }
    }
  });

  it('Given any node above row 0, When its incoming edges are counted, Then it is reachable', () => {
    for (const m of maps) {
      for (const n of m.nodes) {
        if (n.row === 0) continue;
        expect(m.edges.filter((e) => e.to === n.id).length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('Given any node with a wide next row, When its edges are read, Then it offers at least two choices', () => {
    for (const m of maps) {
      for (const n of m.nodes) {
        if (m.nodes.filter((x) => x.row === n.row + 1).length < 2) continue; // narrowing into a lone node
        expect(m.edges.filter((e) => e.from === n.id).length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('Given any map, When walked from every row-0 node, Then the elite, a shop and the boss are all reachable', () => {
    for (const m of maps) {
      const seen = new Set<string>();
      let frontier = m.nodes.filter((n) => n.row === 0).map((n) => n.id);
      frontier.forEach((id) => seen.add(id));
      while (frontier.length) {
        const next: string[] = [];
        for (const id of frontier) {
          for (const to of reachableFrom(m, id)) if (!seen.has(to)) { seen.add(to); next.push(to); }
        }
        frontier = next;
      }
      const kinds = new Set(m.nodes.filter((n) => seen.has(n.id)).map((n) => n.kind));
      expect(kinds.has('elite')).toBe(true);
      expect(kinds.has('shop')).toBe(true);
      expect(kinds.has('boss')).toBe(true);
    }
  });

  it('Given many maps, When lanes are compared across edges, Then some paths cross', () => {
    const crossing = maps.some((m) => m.edges.some((e) => {
      const a = nodeById(m, e.from)!;
      const b = nodeById(m, e.to)!;
      return b.lane !== a.lane;
    }));
    expect(crossing).toBe(true);
  });
});

describe('reachableFrom', () => {
  it('Given no current node, When asked, Then every row-0 node is offered', () => {
    const m = buildRunMap('start', 1);
    expect(reachableFrom(m, null)).toEqual(m.nodes.filter((n) => n.row === 0).map((n) => n.id));
  });

  it('Given a current node, When asked, Then only its own forward edges are offered', () => {
    const m = buildRunMap('start', 1);
    const first = m.nodes.find((n) => n.row === 0)!;
    expect(reachableFrom(m, first.id)).toEqual(m.edges.filter((e) => e.from === first.id).map((e) => e.to));
  });

  it('Given an unknown node id, When asked, Then nothing is reachable', () => {
    expect(reachableFrom(buildRunMap('start', 1), 'nope')).toEqual([]);
  });
});

describe('nodeLevel', () => {
  it('Given a boss node, When mapped, Then it is the boss level', () => {
    for (const m of maps) {
      const boss = m.nodes.find((n) => n.kind === 'boss')!;
      expect(nodeLevel(boss)).toBe(BOSS_LEVEL);
    }
  });

  it('Given an elite node, When mapped, Then it is the elite level', () => {
    for (const m of maps) {
      for (const n of m.nodes.filter((x) => x.kind === 'elite')) expect(nodeLevel(n)).toBe(ELITE_LEVEL);
    }
  });

  it('Given a fight node, When mapped, Then it lands on a non-combat level spec', () => {
    for (const m of maps) {
      for (const n of m.nodes.filter((x) => x.kind === 'fight')) {
        const lvl = nodeLevel(n)!;
        expect(lvl).toBeGreaterThanOrEqual(1);
        expect(lvl).not.toBe(ELITE_LEVEL);
        expect(lvl).not.toBe(BOSS_LEVEL);
        expect(WORLD_LEVELS[m.world - 1][lvl - 1].kind).not.toBe('elite');
        expect(WORLD_LEVELS[m.world - 1][lvl - 1].kind).not.toBe('boss');
      }
    }
  });

  it('Given fight rows, When mapped, Then the level never falls as the row rises', () => {
    for (let r = 1; r < FIGHT_LEVEL_BY_ROW.length; r++) {
      expect(FIGHT_LEVEL_BY_ROW[r]).toBeGreaterThanOrEqual(FIGHT_LEVEL_BY_ROW[r - 1]);
    }
  });

  it('Given a non-play node, When mapped, Then it has no level', () => {
    for (const m of maps) {
      for (const n of m.nodes.filter((x) => !isPlayNode(x.kind))) expect(nodeLevel(n)).toBeNull();
    }
  });
});
