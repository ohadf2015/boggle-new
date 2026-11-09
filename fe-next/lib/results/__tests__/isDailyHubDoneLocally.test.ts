import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockHunt, mockWheel } = vi.hoisted(() => ({
  mockHunt: vi.fn(),
  mockWheel: vi.fn(),
}));

vi.mock('@/utils/dailyChallenge/storage', () => ({
  hasPlayedWordHuntToday: (...args: unknown[]) => mockHunt(...args),
  hasPlayedWordWheelToday: (...args: unknown[]) => mockWheel(...args),
}));

import { isDailyHubDoneLocally } from '../isDailyHubDoneLocally';

describe('isDailyHubDoneLocally', () => {
  beforeEach(() => {
    mockHunt.mockReset();
    mockWheel.mockReset();
  });

  it('is false when any required mode is still open', () => {
    mockWheel.mockReturnValue(true);
    mockHunt.mockReturnValue(false);
    expect(isDailyHubDoneLocally('en')).toBe(false);
  });

  it('is true when every required daily mode is played today', () => {
    mockWheel.mockReturnValue(true);
    mockHunt.mockReturnValue(true);
    expect(isDailyHubDoneLocally('en')).toBe(true);
  });

  it('passes the language through to the storage probes', () => {
    // Wheel is first in DAILY_MODES; leave it true so every() reaches Hunt too.
    mockWheel.mockReturnValue(true);
    mockHunt.mockReturnValue(false);
    isDailyHubDoneLocally('he');
    expect(mockWheel).toHaveBeenCalledWith('he');
    expect(mockHunt).toHaveBeenCalledWith('he');
  });
});
