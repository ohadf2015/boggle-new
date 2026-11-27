// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';

const hasSession = vi.fn();
vi.mock('@/utils/onboardingStorage', () => ({ hasSupabaseSession: () => hasSession() }));

import { HOLIDAY_PROGRESS_EVENT } from '@/lib/holidayEvent/markHolidayPlayed';
import {
  HOLIDAY_EGG_EVENT, loadHunt, noteHolidayGame, noticeHolidayWord, resetHolidayClientForTests,
} from '../holidayClient';

const fetchMock = vi.fn();
const ok = (json: unknown) => ({ ok: true, json: async () => json });

beforeEach(() => {
  resetHolidayClientForTests();
  document.documentElement.className = 'holiday-hanukkah holiday-live';
  document.documentElement.lang = 'en';
  hasSession.mockReset().mockReturnValue(true);
  fetchMock.mockReset().mockResolvedValue(ok({}));
  vi.stubGlobal('fetch', fetchMock);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 11, 9, 20, 0));
});

describe('noticeHolidayWord', () => {
  it('Given LATKE found on a Hanukkah board, then a celebration fires once and the server is told', async () => {
    const heard = vi.fn();
    window.addEventListener(HOLIDAY_EGG_EVENT, heard);
    noticeHolidayWord('LATKE');
    noticeHolidayWord('latke');
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(heard).toHaveBeenCalledTimes(1);
    expect((heard.mock.calls[0][0] as CustomEvent).detail).toMatchObject({ egg: 'word_latke' });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ holiday: 'hanukkah', localDate: '2026-12-09', locale: 'en', egg: 'word_latke' });
    window.removeEventListener(HOLIDAY_EGG_EVENT, heard);
  });

  it('Given no theme or an ordinary word, then nothing happens', () => {
    noticeHolidayWord('table');
    document.documentElement.className = '';
    noticeHolidayWord('latke');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Given a guest, then the celebration still shows but nothing is stored', () => {
    hasSession.mockReturnValue(false);
    const heard = vi.fn();
    window.addEventListener(HOLIDAY_EGG_EVENT, heard);
    noticeHolidayWord('maccabee');
    expect(heard).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
    window.removeEventListener(HOLIDAY_EGG_EVENT, heard);
  });
});

describe('noteHolidayGame', () => {
  it('Given the comeback fires, then the event card hears a lit day', async () => {
    fetchMock.mockResolvedValue(ok({ games: 3, counted: true, comeback: { index: 4, reward: { coins: 50 } } }));
    const heard = vi.fn();
    window.addEventListener(HOLIDAY_PROGRESS_EVENT, heard);
    await noteHolidayGame(12);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ holiday: 'hanukkah', words: 12 });
    expect((heard.mock.calls[0][0] as CustomEvent).detail).toEqual({ status: 'lit', index: 4, reward: { coins: 50 }, comeback: true });
    window.removeEventListener(HOLIDAY_PROGRESS_EVENT, heard);
  });

  it('Given a guest, then nothing is sent', async () => {
    hasSession.mockReturnValue(false);
    await noteHolidayGame(3);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('loadHunt', () => {
  it('Given twelve spots asking at once, then the slot is fetched once', async () => {
    fetchMock.mockResolvedValue(ok({ slot: 'profile', item: 'gelt', foundToday: false, count: 0, goal: 8, seeker: false }));
    const all = await Promise.all([loadHunt(), loadHunt(), loadHunt()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(all[2]?.slot).toBe('profile');
  });

  it('Given the fetch fails, then the next ask retries instead of caching the failure', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    expect(await loadHunt()).toBeNull();
    fetchMock.mockResolvedValue(ok({ slot: 'friends' }));
    expect((await loadHunt())?.slot).toBe('friends');
  });
});
