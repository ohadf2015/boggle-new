import { describe, it, expect } from 'vitest';
import { buildRunMap } from '@/lib/adventure/play/runMap';
import { trailSteps } from '../mapTrail';

const map = buildRunMap('seed-trail', 1);
const first = map.nodes.find((n) => n.row === 0)!;
const second = map.edges.find((e) => e.from === first.id)!.to;
const third = map.edges.find((e) => e.from === second)!.to;

describe('mapTrail', () => {
  it('Given a run that walked three nodes, when the trail is built, then EVERY node is a step, in order', () => {
    const steps = trailSteps(map, [first.id, second, third], third);
    expect(steps.map((s) => s.id)).toEqual([first.id, second, third]);
    expect(steps.map((s) => s.step)).toEqual([1, 2, 3]);
    expect(steps.map((s) => s.kind)).toEqual([
      first.kind,
      map.nodes.find((n) => n.id === second)!.kind,
      map.nodes.find((n) => n.id === third)!.kind,
    ]);
  });

  it('Given the node the run stands on, when the trail is built, then only that step is current', () => {
    const steps = trailSteps(map, [first.id, second, third], second);
    expect(steps.filter((s) => s.current).map((s) => s.id)).toEqual([second]);
  });

  it('Given a finished run with no position, when the trail is built, then no step is current', () => {
    expect(trailSteps(map, [first.id, second], null).some((s) => s.current)).toBe(false);
  });

  it('Given a path holding an id the map does not know, when the trail is built, then it is dropped but numbering stays contiguous', () => {
    const steps = trailSteps(map, [first.id, 'r99l9', second], second);
    expect(steps.map((s) => s.id)).toEqual([first.id, second]);
    expect(steps.map((s) => s.step)).toEqual([1, 2]);
  });

  it('Given a fresh run, when the trail is built, then it is empty (nothing to recap)', () => {
    expect(trailSteps(map, [], null)).toEqual([]);
  });
});
