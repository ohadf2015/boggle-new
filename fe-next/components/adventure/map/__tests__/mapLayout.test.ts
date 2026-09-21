import { describe, it, expect } from 'vitest';
import { buildRunMap, BOSS_ROW } from '@/lib/adventure/play/runMap';
import {
  layoutMap, edgeLines, nodeStatuses, pendingFight, mapHeight, ROW_GAP_PX, MAP_PAD_PX,
} from '../mapLayout';

const map = buildRunMap('seed-abc', 1);

describe('mapLayout geometry', () => {
  it('Given a run map, when it is laid out, then row 0 sits at the bottom and the boss at the top', () => {
    const laid = layoutMap(map);
    const bottom = laid.find((n) => n.node.row === 0)!;
    const boss = laid.find((n) => n.node.kind === 'boss')!;
    expect(boss.y).toBeLessThan(bottom.y);
    expect(bottom.y).toBeCloseTo(mapHeight(map.rows) - MAP_PAD_PX, 0);
    expect(boss.node.row).toBe(BOSS_ROW);
  });

  it('Given lanes in a row, when laid out, then every x stays inside the gutters and lanes keep their order', () => {
    const laid = layoutMap(map);
    // Row 0 is a single node now; row 1 is the first real choice.
    const row0 = laid.filter((n) => n.node.row === 1).sort((a, b) => a.node.lane - b.node.lane);
    expect(row0.length).toBeGreaterThan(1);
    for (const n of laid) {
      expect(n.x).toBeGreaterThanOrEqual(8);
      expect(n.x).toBeLessThanOrEqual(92);
    }
    for (let i = 1; i < row0.length; i++) expect(row0[i].x).toBeGreaterThan(row0[i - 1].x);
  });

  it('Given the same map twice, when laid out, then the positions are identical (seeded, not random)', () => {
    expect(layoutMap(map)).toEqual(layoutMap(buildRunMap('seed-abc', 1)));
  });

  it('Given the single boss node, when laid out, then it is centred', () => {
    const boss = layoutMap(map).find((n) => n.node.kind === 'boss')!;
    expect(boss.x).toBe(50);
  });

  it('Given map rows, when the height is computed, then it is tall enough to scroll every row', () => {
    expect(mapHeight(map.rows)).toBe((map.rows - 1) * ROW_GAP_PX + MAP_PAD_PX * 2);
  });

  it('Given the map edges, when lines are built, then each line joins the two node centres', () => {
    const laid = layoutMap(map);
    const lines = edgeLines(map, laid);
    expect(lines).toHaveLength(map.edges.length);
    const byId = new Map(laid.map((n) => [n.node.id, n]));
    for (const line of lines) {
      expect(line.x1).toBe(byId.get(line.from)!.x);
      expect(line.y1).toBe(byId.get(line.from)!.y);
      expect(line.x2).toBe(byId.get(line.to)!.x);
      expect(line.y2).toBe(byId.get(line.to)!.y);
    }
  });
});

describe('mapLayout node status', () => {
  const first = map.nodes.find((n) => n.row === 0)!;
  const second = map.edges.find((e) => e.from === first.id)!.to;

  it('Given no move yet, when statuses are read, then row 0 is choosable and nothing is done', () => {
    const s = nodeStatuses({ map, path: [], currentNode: null, reachable: map.nodes.filter((n) => n.row === 0).map((n) => n.id) });
    expect(s[first.id]).toBe('next');
    expect(Object.values(s).filter((v) => v === 'done')).toHaveLength(0);
  });

  it('Given a walked path, when statuses are read, then walked nodes are done, the position is current and its edges are next', () => {
    const s = nodeStatuses({ map, path: [first.id], currentNode: first.id, reachable: [second] });
    expect(s[first.id]).toBe('current');
    expect(s[second]).toBe('next');
    const untouched = map.nodes.find((n) => n.id !== first.id && n.id !== second)!;
    expect(s[untouched.id]).toBe('far');
  });

  it('Given an earlier node in the path, when statuses are read, then it is done', () => {
    const s = nodeStatuses({ map, path: [first.id, second], currentNode: second, reachable: [] });
    expect(s[first.id]).toBe('done');
    expect(s[second]).toBe('current');
  });

  it('Given an unfinished fight underfoot, when statuses are read, then the next row is NOT choosable', () => {
    const s = nodeStatuses({ map, path: [first.id], currentNode: first.id, reachable: [second], blocked: true });
    expect(s[second]).toBe('far');
    expect(s[first.id]).toBe('current');
  });
});

describe('pendingFight', () => {
  const fight = map.nodes.find((n) => n.kind === 'fight')!;
  const rest = map.nodes.find((n) => n.kind === 'rest')!;

  it('Given the run stands on a fight it has not cleared, then the fight is pending', () => {
    expect(pendingFight(map, fight.id, [])).toBe(true);
  });

  it('Given that fight was cleared, then nothing is pending', () => {
    expect(pendingFight(map, fight.id, [fight.id])).toBe(false);
  });

  it('Given the run stands on a campfire, then nothing is pending', () => {
    expect(pendingFight(map, rest.id, [])).toBe(false);
  });

  it('Given the run has not entered the map, then nothing is pending', () => {
    expect(pendingFight(map, null, [])).toBe(false);
  });
});
