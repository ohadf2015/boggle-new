import { describe, it, expect } from 'vitest';
import { buildRunMap } from '@/lib/adventure/play/runMap';
import { stepToward } from '../demoPath';

describe('stepToward — the dev walk that reaches one node kind', () => {
  const map = buildRunMap('seed-demo', 1);

  it('Given no position yet, then the first step is a row-0 node on a path that reaches a shop', () => {
    const first = stepToward(map, null, 'shop');
    expect(first).not.toBeNull();
    expect(map.nodes.find((n) => n.id === first)?.row).toBe(0);
  });

  it('Given a kind that is guaranteed on every map, then walking step by step arrives at it', () => {
    let at: string | null = null;
    for (let i = 0; i < 10; i++) {
      const next = stepToward(map, at, 'shop');
      if (!next) break;
      at = next;
      if (map.nodes.find((n) => n.id === at)?.kind === 'shop') break;
    }
    expect(map.nodes.find((n) => n.id === at)?.kind).toBe('shop');
  });

  it('Given the run already stands on that kind, then there is nothing left to walk', () => {
    const shop = map.nodes.find((n) => n.kind === 'shop')!;
    expect(stepToward(map, shop.id, 'shop')).toBeNull();
  });

  it('Given a kind no node has, then it refuses to walk rather than looping', () => {
    const noBoss = { ...map, nodes: map.nodes.filter((n) => n.kind !== 'boss') };
    expect(stepToward(noBoss, null, 'boss')).toBeNull();
  });
});
