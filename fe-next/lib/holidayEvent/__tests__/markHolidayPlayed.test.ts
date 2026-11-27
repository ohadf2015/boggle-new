// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';

const hasSession = vi.fn();
vi.mock('@/utils/onboardingStorage', () => ({ hasSupabaseSession: () => hasSession() }));

import { HOLIDAY_PROGRESS_EVENT, markHolidayPlayed, resetHolidayPlayedForTests } from '../markHolidayPlayed';

const fetchMock = vi.fn();

describe('markHolidayPlayed', () => {
  beforeEach(() => {
    resetHolidayPlayedForTests();
    document.documentElement.className = '';
    hasSession.mockReset().mockReturnValue(true);
    fetchMock.mockReset().mockResolvedValue({ ok: true, json: async () => ({ status: 'lit', index: 1 }) });
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 11, 5, 23, 30));
  });

  it('Given no holiday theme on the page, then nothing is sent', async () => {
    await markHolidayPlayed();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Given a guest, then nothing is sent (the track is read-only for guests)', async () => {
    document.documentElement.classList.add('holiday-hanukkah');
    hasSession.mockReturnValue(false);
    await markHolidayPlayed();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Given Hanukkah is on, when two games finish the same local day, then one POST with the local date goes out and the card is told', async () => {
    document.documentElement.classList.add('holiday-hanukkah');
    const heard = vi.fn();
    window.addEventListener(HOLIDAY_PROGRESS_EVENT, heard);
    await markHolidayPlayed();
    await markHolidayPlayed();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/holiday/progress');
    expect(JSON.parse(init.body)).toEqual({ holiday: 'hanukkah', localDate: '2026-12-05', locale: document.documentElement.lang });
    expect(heard).toHaveBeenCalledTimes(1);
    window.removeEventListener(HOLIDAY_PROGRESS_EVENT, heard);
  });

  it('Given the POST fails, then a later game the same day may retry', async () => {
    document.documentElement.classList.add('holiday-christmas');
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    await markHolidayPlayed();
    await markHolidayPlayed();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('Given fetch throws, then it never throws into the game-end path', async () => {
    document.documentElement.classList.add('holiday-christmas');
    fetchMock.mockRejectedValue(new Error('offline'));
    await expect(markHolidayPlayed()).resolves.toBeUndefined();
  });
});
