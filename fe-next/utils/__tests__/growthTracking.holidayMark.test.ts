// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mark = vi.fn();
vi.mock('@/lib/holidayEvent/markHolidayPlayed', () => ({ markHolidayPlayed: () => mark() }));
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: {
    capture: vi.fn(),
    get_distinct_id: () => 'test-distinct-id',
    people: { set: vi.fn(), set_once: vi.fn() },
    setPersonProperties: vi.fn(),
    identify: vi.fn(),
    __loaded: true,
  },
}));
vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: async () => ({}) })));

describe('trackGameEnd lights the holiday track', () => {
  beforeEach(() => {
    vi.resetModules();
    mark.mockReset().mockResolvedValue(undefined);
  });

  it('Given a finished game in any mode, then the holiday day is marked once', async () => {
    const { trackGameStart, trackGameEnd } = await import('../growthTracking');
    trackGameStart('classic', {});
    trackGameEnd('classic', 10, 3, true, 60);
    trackGameEnd('classic', 10, 3, true, 60);
    expect(mark).toHaveBeenCalledTimes(1);
  });

  it('Given an abandoned game, then nothing is marked', async () => {
    const { trackGameStart, trackGameEnd } = await import('../growthTracking');
    trackGameStart('blast', {});
    trackGameEnd('blast', 0, 0, false);
    expect(mark).not.toHaveBeenCalled();
  });
});
