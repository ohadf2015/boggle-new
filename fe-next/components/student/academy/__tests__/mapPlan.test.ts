import { describe, it, expect } from 'vitest';
import { planMap, keepOrder } from '../mapPlan';
import { nodeExtents } from '../nodeExtents';
import type { AcademyIsland } from '../academyIslands';

const lesson = (i: number, state: AcademyIsland['state'] = 'open'): AcademyIsland => ({
  key: `lesson-${i}`, kind: 'lesson', type: 'lesson', state, stars: state === 'done' ? 3 : 0, mastery: 0, name: 'Animals and their habitats',
});
const boss: AcademyIsland = { key: 'boss', kind: 'boss', type: 'boss', state: 'locked', stars: 0, mastery: 0, progress: { have: 0, need: 12 } };
const path = [lesson(0, 'done'), lesson(1), lesson(2), { ...lesson(3), key: 'review', kind: 'review' as const }, { ...lesson(4), key: 'arena', kind: 'arena' as const, state: 'waiting' as const }];

const extentsOf = (node: AcademyIsland, recommended: boolean, compact: number) =>
  nodeExtents(node, node.kind === 'boss' ? 'Boss' : 'Animals and their habitats', node.kind === 'boss' ? 'Master 0/12 words' : null, { big: false, recommended, tag: recommended, compact }, 1);

const plan = (height: number, top: number, bottom: number, measured = true) =>
  planMap({
    islands: path,
    boss,
    recommendedKey: 'lesson-1',
    layout: 'portrait',
    view: { width: 390, height },
    insets: { top, bottom, left: 8, right: 8 },
    measured,
    extentsOf,
  });

describe('keepOrder', () => {
  it('keeps the recommended island first, then the map-only stops (review, workshop), then what is ahead, then what is behind', () => {
    expect(keepOrder(path, 'lesson-1').map((n) => n.key)).toEqual(['lesson-1', 'review', 'lesson-2', 'arena', 'lesson-0']);
  });

  it('without a recommended island, keeps the map-only stops, then the islands nearest the castle', () => {
    expect(keepOrder(path, 'boss').map((n) => n.key)).toEqual(['review', 'arena', 'lesson-2', 'lesson-1', 'lesson-0']);
  });

  it('keeps Word Workshop ahead of other lessons too: the dock has no door to it', () => {
    const withWorkshop = [lesson(0), lesson(1), { ...lesson(2), key: 'workshop', kind: 'workshop' as const }];
    expect(keepOrder(withWorkshop, 'lesson-0').map((n) => n.key)).toEqual(['lesson-0', 'workshop', 'lesson-1']);
  });
});

describe('planMap', () => {
  it('on a short phone screen shows fewer islands, never piles them up or under the chrome', () => {
    const p = plan(744, 180, 200);
    expect(p.fit.crowded).toBe(false);
    expect(p.fit.spills).toBe(false);
    expect(p.shown.length).toBeLessThan(path.length);
    expect(p.shown.map((n) => n.key)).toContain('lesson-1');
    expect(p.fit.width / 390).toBeGreaterThanOrEqual(0.7);
  });

  it('keeps path order among the islands it shows, with a point for each', () => {
    const p = plan(744, 180, 200);
    const order = path.map((n) => n.key).filter((k) => p.shown.some((s) => s.key === k));
    expect(p.shown.map((n) => n.key)).toEqual(order);
    expect(p.points).toHaveLength(p.shown.length);
  });

  it('shows every island when the screen has room for them', () => {
    const p = planMap({
      islands: path, boss, recommendedKey: 'lesson-1', layout: 'portrait',
      view: { width: 900, height: 2200 }, insets: { top: 120, bottom: 200, left: 8, right: 8 }, measured: true, extentsOf,
    });
    expect(p.shown).toHaveLength(path.length);
    expect(p.fit.crowded).toBe(false);
  });

  it('without a layout engine (first frame, tests) shows everything at full detail', () => {
    const p = plan(744, 300, 300, false);
    expect(p.shown).toHaveLength(path.length);
    expect(p.compact).toBe(0);
  });

  it('focuses the recommended island among those shown', () => {
    const p = plan(744, 180, 200);
    const i = p.shown.findIndex((n) => n.key === 'lesson-1');
    expect(p.focus).toEqual(p.points[i]);
  });
});
