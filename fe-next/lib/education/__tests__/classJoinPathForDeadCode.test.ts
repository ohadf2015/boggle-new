import { describe, it, expect, vi } from 'vitest';
import { classJoinPathForDeadCode } from '@/lib/education/classJoinPathForDeadCode';
import { resolveJoinCodeVerdict } from '@/lib/education/joinCodeVerdict';

vi.mock('@/lib/education/joinCodeVerdict', () => ({ resolveJoinCodeVerdict: vi.fn() }));

describe('classJoinPathForDeadCode', () => {
  it.each(['classroom', 'game', 'ended'] as const)('sends a %s code typed into the multiplayer box to the class join', async (verdict) => {
    vi.mocked(resolveJoinCodeVerdict).mockResolvedValue(verdict);

    await expect(classJoinPathForDeadCode(' 54u628 ', 'he')).resolves.toBe('/he/join/54U628');
  });

  it.each(['invalid', 'unverified'] as const)('leaves a %s code to the Quick Play offer', async (verdict) => {
    vi.mocked(resolveJoinCodeVerdict).mockResolvedValue(verdict);

    await expect(classJoinPathForDeadCode('ABC123', 'en')).resolves.toBeNull();
  });
});
