import { describe, it, expect } from 'vitest';
import { HUNT_SLOTS, HUNT_GOAL, huntSlotFor, huntItemFor, isHuntSlot } from '../hunt';

describe('huntSlotFor', () => {
  it('Given the same user and date, then the slot is stable', () => {
    expect(huntSlotFor('u1', '2026-12-05')).toBe(huntSlotFor('u1', '2026-12-05'));
    expect(HUNT_SLOTS).toContain(huntSlotFor('u1', '2026-12-05'));
  });

  it('Given many days, then the item moves around across most of the 12 screens', () => {
    expect(HUNT_SLOTS).toHaveLength(12);
    const seen = new Set(Array.from({ length: 40 }, (_, d) => huntSlotFor('u1', `2026-12-${String((d % 28) + 1).padStart(2, '0')}-${d}`)));
    expect(seen.size).toBeGreaterThanOrEqual(8);
  });

  it('Given two users on one day, then they are not forced to the same screen', () => {
    const slots = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((u) => huntSlotFor(u, '2026-12-20')));
    expect(slots.size).toBeGreaterThan(1);
  });
});

describe('huntItemFor', () => {
  it('Given each holiday, then its own peek art is used', () => {
    expect(['doughnut', 'dreidel', 'gelt', 'latke']).toContain(huntItemFor('hanukkah', '2026-12-06'));
    expect(['ornament', 'elf', 'gingerbread', 'snowman', 'candycane']).toContain(huntItemFor('christmas', '2026-12-16'));
    expect(huntItemFor('christmas', '2026-12-16')).not.toBe(huntItemFor('christmas', '2026-12-17'));
  });
});

describe('goal and slot validation', () => {
  it('Given the goals, then Hanukkah needs 8 finds and Christmas 12', () => {
    expect(HUNT_GOAL).toEqual({ hanukkah: 8, christmas: 12 });
  });

  it('Given an unknown slot string, then it is rejected', () => {
    expect(isHuntSlot('profile')).toBe(true);
    expect(isHuntSlot('admin')).toBe(false);
  });
});
