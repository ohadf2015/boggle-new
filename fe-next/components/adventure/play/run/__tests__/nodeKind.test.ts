import { describe, it, expect } from 'vitest';
import { currentNodeKind, NODE_CHIP } from '../nodeKind';
import { buildRunMap } from '@/lib/adventure/play/runMap';

describe('currentNodeKind — what the HUD chip says we are standing on', () => {
  const map = buildRunMap('seed-hud', 1);

  it('Given the map and the node we are on, then the chip reads that node kind', () => {
    const node = map.nodes.find((n) => n.kind === 'elite')!;
    expect(currentNodeKind(map, node.id, null)).toBe('elite');
    const boss = map.nodes.find((n) => n.kind === 'boss')!;
    expect(currentNodeKind(map, boss.id, null)).toBe('boss');
  });

  it('Given no map yet (round-1 single-level flow), then it falls back to the level spec', () => {
    expect(currentNodeKind(null, null, { isBoss: true, kind: 'boss' })).toBe('boss');
    expect(currentNodeKind(null, null, { isBoss: false, kind: 'elite' })).toBe('elite');
    expect(currentNodeKind(null, null, { isBoss: false, kind: 'classic' })).toBe('fight');
  });

  it('Given a map but an unknown current node, then it still falls back rather than showing nothing', () => {
    expect(currentNodeKind(map, 'r99l9', { isBoss: false, kind: 'fog' })).toBe('fight');
  });

  it('Given neither a node nor a level, then there is no chip', () => {
    expect(currentNodeKind(null, null, null)).toBeNull();
  });

  it('Given every node kind, then a chip style exists for it (no unstyled kind can reach the HUD)', () => {
    for (const n of map.nodes) expect(NODE_CHIP[n.kind]).toBeTruthy();
  });
});
