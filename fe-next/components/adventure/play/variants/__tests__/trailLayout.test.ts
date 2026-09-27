import { describe, it, expect } from 'vitest';
import { getPlayLevel, LEVELS_PER_WORLD, WORLD_COUNT, type LevelKind } from '@/lib/adventure/play/levels';
import { NODE_SHAPE, TRAIL_H, TRAIL_W, trailNodes, nodeStatus, linkDone, rampOf, labelBox } from '../trailLayout';

const KINDS: LevelKind[] = ['classic', 'hunt', 'chain', 'fog', 'bomb', 'elite', 'boss'];
const kindsOf = (w: number) => Array.from({ length: LEVELS_PER_WORLD }, (_, i) => getPlayLevel(w, i + 1).kind);

describe('trailLayout', () => {
  it('Given every level kind, When mapped to node shapes, Then each kind has its own silhouette', () => {
    const shapes = KINDS.map((k) => NODE_SHAPE[k]);
    expect(new Set(shapes).size).toBe(KINDS.length);
  });

  it('Given a world, When laid out, Then the boss node is biggest and the elite beats every normal node', () => {
    for (let w = 1; w <= WORLD_COUNT; w++) {
      const nodes = trailNodes(kindsOf(w));
      const boss = nodes.find((n) => n.kind === 'boss')!;
      const elites = nodes.filter((n) => n.kind === 'elite');
      const normal = nodes.filter((n) => n.kind !== 'boss' && n.kind !== 'elite');
      for (const e of elites) {
        expect(boss.size).toBeGreaterThan(e.size);
        for (const n of normal) expect(e.size).toBeGreaterThan(n.size);
      }
    }
  });

  it('Given a world, When laid out, Then the trail climbs: level 1 at the bottom, the boss at the top', () => {
    const nodes = trailNodes(kindsOf(1));
    for (let i = 1; i < nodes.length; i++) expect(nodes[i].y).toBeLessThan(nodes[i - 1].y);
  });

  it('Given any world, When laid out, Then nodes stay inside the board and never overlap', () => {
    for (let w = 1; w <= WORLD_COUNT; w++) {
      const nodes = trailNodes(kindsOf(w));
      for (const n of nodes) {
        expect(n.x - n.size / 2).toBeGreaterThanOrEqual(0);
        expect(n.x + n.size / 2).toBeLessThanOrEqual(TRAIL_W);
        expect(n.y - n.size / 2).toBeGreaterThanOrEqual(0);
        expect(n.y + n.size / 2).toBeLessThanOrEqual(TRAIL_H);
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
          expect(d).toBeGreaterThan((nodes[i].size + nodes[j].size) / 2);
        }
      }
    }
  });

  it('Given a normal node, When labelled, Then the label hangs off the OUTER side; big nodes wear a nameplate', () => {
    for (const n of trailNodes(kindsOf(2))) {
      if (n.kind === 'elite' || n.kind === 'boss') expect(n.labelSide).toBe('plate');
      else expect(n.labelSide).toBe(n.x < TRAIL_W / 2 ? 'left' : 'right');
    }
  });

  it('Given any world, When labelled, Then no label box hits another node or another label', () => {
    type R = { x0: number; x1: number; y0: number; y1: number };
    const hit = (a: R, b: R) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
    for (let w = 1; w <= WORLD_COUNT; w++) {
      const nodes = trailNodes(kindsOf(w));
      const boxes = nodes.map((n) => ({
        node: { x0: n.x - n.size / 2, x1: n.x + n.size / 2, y0: n.y - n.size / 2, y1: n.y + n.size / 2 },
        label: labelBox(n),
      }));
      for (const n of boxes.map((b) => b.label)) {
        expect(n.x0).toBeGreaterThanOrEqual(0);
        expect(n.x1).toBeLessThanOrEqual(TRAIL_W);
        expect(n.y1).toBeLessThanOrEqual(TRAIL_H);
      }
      for (let i = 0; i < boxes.length; i++) {
        for (let j = 0; j < boxes.length; j++) {
          if (i === j) continue;
          expect(hit(boxes[i].label, boxes[j].node), `w${w} label ${i + 1} vs node ${j + 1}`).toBe(false);
          if (j > i) expect(hit(boxes[i].label, boxes[j].label), `w${w} label ${i + 1} vs label ${j + 1}`).toBe(false);
        }
      }
    }
  });

  it('Given progress, When a node is resolved, Then it is cleared / current / open / locked', () => {
    expect(nodeStatus({ stars: 2, isUnlocked: true, isCurrent: false, pathState: null })).toBe('cleared');
    expect(nodeStatus({ stars: 0, isUnlocked: true, isCurrent: true, pathState: null })).toBe('current');
    expect(nodeStatus({ stars: 0, isUnlocked: true, isCurrent: false, pathState: null })).toBe('open');
    expect(nodeStatus({ stars: 0, isUnlocked: false, isCurrent: false, pathState: null })).toBe('locked');
  });

  it('Given an active run, When a node is resolved, Then the run path wins over lifetime stars', () => {
    expect(nodeStatus({ stars: 3, isUnlocked: true, isCurrent: false, pathState: 'current' })).toBe('current');
    expect(nodeStatus({ stars: 3, isUnlocked: true, isCurrent: false, pathState: 'ahead' })).toBe('open');
    expect(nodeStatus({ stars: 0, isUnlocked: true, isCurrent: false, pathState: 'cleared' })).toBe('cleared');
  });

  it('Given two neighbours, When the link is drawn, Then it is solid only once the upper node is reached', () => {
    expect(linkDone('cleared')).toBe(true);
    expect(linkDone('current')).toBe(true);
    expect(linkDone('open')).toBe(false);
    expect(linkDone('locked')).toBe(false);
  });

  it('Given a world, When the ramp is built, Then threat never drops before the boss and the boss is max', () => {
    for (let w = 1; w <= WORLD_COUNT; w++) {
      const ramp = rampOf(w);
      expect(ramp).toHaveLength(LEVELS_PER_WORLD);
      expect(ramp[LEVELS_PER_WORLD - 1].threat).toBe(5);
      expect(ramp[3].kind).toBe('elite');
      expect(ramp[3].threat).toBeGreaterThan(ramp[0].threat);
    }
  });

  it('Given later worlds, When compared, Then the opening level is at least as threatening as world 1', () => {
    expect(rampOf(10)[0].threat).toBeGreaterThanOrEqual(rampOf(1)[0].threat);
  });
});
