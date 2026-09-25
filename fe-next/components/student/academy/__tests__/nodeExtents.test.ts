import { describe, it, expect } from 'vitest';
import { nodeExtents, nodeSize, showBossChip, showTag } from '../nodeExtents';

const lesson = { kind: 'lesson', state: 'open' } as const;
const boss = { kind: 'boss', state: 'locked' } as const;
const look = { big: false, recommended: false, tag: false, compact: 0 };

describe('nodeExtents — the px box an island needs around its point', () => {
  it('a recommended island reaches higher (pointer + tag) than a plain one', () => {
    const plain = nodeExtents(lesson, 'Week 1', null, look, 1);
    const rec = nodeExtents(lesson, 'Week 1', null, { ...look, recommended: true, tag: true }, 1);
    const recNoTag = nodeExtents(lesson, 'Week 1', null, { ...look, recommended: true, tag: true, compact: 3 }, 1);
    expect(rec.up).toBeGreaterThan(recNoTag.up);
    expect(recNoTag.up).toBeGreaterThan(plain.up);
  });

  it('a long plaque widens the box; the boss chip widens the boss', () => {
    expect(nodeExtents(lesson, 'Weekly Vocabulary Unit Seven', null, look, 1).half).toBeGreaterThan(nodeExtents(lesson, 'Hi', null, look, 1).half);
    expect(nodeExtents(boss, 'Boss', 'Master 0/4 words', look, 1).half).toBeGreaterThan(nodeExtents(boss, 'Boss', null, look, 1).half);
  });

  it('scales every extent with the UI scale', () => {
    const a = nodeExtents(lesson, 'Week 1', null, look, 1);
    const b = nodeExtents(lesson, 'Week 1', null, look, 2);
    expect(b.up).toBeCloseTo(a.up * 2, 5);
    expect(b.half).toBeCloseTo(a.half * 2, 5);
  });

  it('crowding sheds in order: boss chip first, then the big recommended node, then the tag word', () => {
    expect(showBossChip(0)).toBe(true);
    expect(showBossChip(1)).toBe(false);
    expect(nodeSize(false, { ...look, recommended: true, compact: 1 })).toBe(nodeSize(false, { ...look, recommended: true, compact: 0 }));
    expect(nodeSize(false, { ...look, recommended: true, compact: 2 })).toBeLessThan(nodeSize(false, { ...look, recommended: true, compact: 0 }));
    expect(showTag(2)).toBe(true);
    expect(showTag(3)).toBe(false);
  });
});
