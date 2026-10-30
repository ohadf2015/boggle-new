import { describe, it, expect } from 'vitest';
import { newlyPassedRivals, rivalKey } from '../useWheelRivals';

const rival = (name: string, score: number, playerId: string | null = null, guestFingerprint: string | null = null) => ({
  name, score, avatarImage: null, customAvatar: null, playerId, guestFingerprint,
});

describe('newlyPassedRivals', () => {
  it('a tie is not a pass', () => {
    expect(newlyPassedRivals([rival('Ana', 40, 'a')], 40, new Set())).toEqual([]);
  });

  it('passing means strictly above', () => {
    expect(newlyPassedRivals([rival('Ana', 40, 'a')], 41, new Set()).map(r => r.name)).toEqual(['Ana']);
  });

  it('two rivals sharing a display name are both celebrated', () => {
    const passed = new Set<string>();
    const out = newlyPassedRivals([rival('Guest', 10, null, 'g1'), rival('Guest', 20, null, 'g2')], 30, passed);
    expect(out).toHaveLength(2);
    expect(passed.has(rivalKey(rival('Guest', 10, null, 'g1')))).toBe(true);
  });

  it('a rival is celebrated once', () => {
    const passed = new Set<string>();
    newlyPassedRivals([rival('Ana', 10, 'a')], 20, passed);
    expect(newlyPassedRivals([rival('Ana', 10, 'a')], 40, passed)).toEqual([]);
  });

  it('zero-score rows never count', () => {
    expect(newlyPassedRivals([rival('Zed', 0, 'z')], 5, new Set())).toEqual([]);
  });
});
