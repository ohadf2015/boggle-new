import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Profile = { country_code?: string | null; holiday_key?: 'hanukkah' | 'christmas' | null };
const updateProfile = vi.fn(async (_u: Partial<Profile>) => ({ data: null, error: null as null | { message: string } }));
const auth = { isAuthenticated: false, loading: false, profile: null as null | Profile, updateProfile };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));

import { useHoliday } from '../useHoliday';
import { __resetHolidayStore, keepHolidayClass } from '@/lib/holidays/holidayDom';

const html = document.documentElement;

function clearCookie() {
  document.cookie = 'lx_holiday=; path=/; max-age=0';
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-12-20T12:00:00'));
  html.className = 'dark';
  html.removeAttribute('data-holiday-region');
  html.removeAttribute('data-holiday-preview');
  clearCookie();
  Object.assign(auth, { isAuthenticated: false, loading: false, profile: null });
  updateProfile.mockReset();
  updateProfile.mockResolvedValue({ data: null, error: null });
  __resetHolidayStore();
});

afterEach(() => vi.useRealTimers());

describe('useHoliday', () => {
  it('given the pre-paint class holiday-christmas, returns christmas resolved', () => {
    html.classList.add('holiday-christmas');
    html.setAttribute('data-holiday-region', 'world');
    const { result } = renderHook(() => useHoliday());
    expect(result.current.holiday).toBe('christmas');
    expect(result.current.resolved).toBe(true);
  });

  it('given no holiday class, returns null resolved', () => {
    const { result } = renderHook(() => useHoliday());
    expect(result.current.holiday).toBeNull();
    expect(result.current.resolved).toBe(true);
  });

  it('given a signed-in player whose profile is still loading, is not resolved', () => {
    html.classList.add('holiday-christmas');
    Object.assign(auth, { isAuthenticated: true, loading: true, profile: null });
    const { result } = renderHook(() => useHoliday());
    expect(result.current.resolved).toBe(false);
  });

  it('given profile country IL while the guess said world, switches to hanukkah in its window', () => {
    vi.setSystemTime(new Date('2026-12-06T12:00:00'));
    html.setAttribute('data-holiday-region', 'world');
    Object.assign(auth, { isAuthenticated: true, loading: false, profile: { country_code: 'IL' } });
    const { result } = renderHook(() => useHoliday());
    expect(result.current.holiday).toBe('hanukkah');
    expect(result.current.region).toBe('IL');
    expect(html.classList.contains('holiday-hanukkah')).toBe(true);
  });

  it('given profile country US while the guess said IL, switches hanukkah off outside christmas', () => {
    vi.setSystemTime(new Date('2026-12-06T12:00:00'));
    html.classList.add('holiday-hanukkah');
    html.setAttribute('data-holiday-region', 'IL');
    Object.assign(auth, { isAuthenticated: true, loading: false, profile: { country_code: 'US' } });
    const { result } = renderHook(() => useHoliday());
    expect(result.current.holiday).toBeNull();
    expect(html.classList.contains('holiday-hanukkah')).toBe(false);
  });

  it('given an override cookie, the profile country does not change the theme', () => {
    vi.setSystemTime(new Date('2026-12-06T12:00:00'));
    document.cookie = 'lx_holiday=hanukkah; path=/';
    html.classList.add('holiday-hanukkah');
    html.setAttribute('data-holiday-region', 'world');
    Object.assign(auth, { isAuthenticated: true, loading: false, profile: { country_code: 'US' } });
    const { result } = renderHook(() => useHoliday());
    expect(result.current.holiday).toBe('hanukkah');
  });

  it('given a preview-forced class, the profile country does not remove it', () => {
    vi.setSystemTime(new Date('2026-07-01T12:00:00'));
    document.cookie = 'lx_holiday=christmas; path=/';
    html.classList.add('holiday-christmas');
    html.setAttribute('data-holiday-preview', '1');
    Object.assign(auth, { isAuthenticated: true, loading: false, profile: { country_code: 'IL' } });
    const { result } = renderHook(() => useHoliday());
    expect(result.current.holiday).toBe('christmas');
  });

  it('lists the holidays whose window is open today', () => {
    vi.setSystemTime(new Date('2027-12-26T12:00:00'));
    expect(renderHook(() => useHoliday()).result.current.available).toEqual(['hanukkah', 'christmas']);
    vi.setSystemTime(new Date('2026-12-14T12:00:00'));
    __resetHolidayStore();
    expect(renderHook(() => useHoliday()).result.current.available).toEqual(['christmas']);
  });

  it('given the Dec 1 coming-soon preview class, exposes the theme but no live holiday', () => {
    vi.setSystemTime(new Date('2026-12-05T12:00:00'));
    html.classList.add('holiday-christmas', 'holiday-preview');
    html.setAttribute('data-holiday-region', 'world');
    const { result } = renderHook(() => useHoliday());
    expect(result.current).toMatchObject({ holiday: null, theme: 'christmas', phase: 'preview', resolved: true });
  });

  it('given the profile says IL on Dec 2, switches to the hanukkah preview and its classes', () => {
    vi.setSystemTime(new Date('2026-12-02T12:00:00'));
    html.classList.add('holiday-christmas', 'holiday-preview');
    html.setAttribute('data-holiday-region', 'world');
    Object.assign(auth, { isAuthenticated: true, loading: false, profile: { country_code: 'IL' } });
    const { result } = renderHook(() => useHoliday());
    expect(result.current).toMatchObject({ holiday: null, theme: 'hanukkah', phase: 'preview' });
    expect([...html.classList].sort()).toEqual(['dark', 'holiday-hanukkah', 'holiday-preview']);
  });

  it('given night 1 after the preview, the store flips to live', () => {
    vi.setSystemTime(new Date('2026-12-04T12:00:00'));
    html.classList.add('holiday-hanukkah', 'holiday-live');
    html.setAttribute('data-holiday-region', 'IL');
    const { result } = renderHook(() => useHoliday());
    expect(result.current).toMatchObject({ holiday: 'hanukkah', theme: 'hanukkah', phase: 'live' });
  });

  it('given a saved profile holiday that differs from the location, applies it and mirrors it to the cookie', () => {
    vi.setSystemTime(new Date('2026-12-06T12:00:00'));
    html.classList.add('holiday-hanukkah', 'holiday-live');
    html.setAttribute('data-holiday-region', 'IL');
    Object.assign(auth, { isAuthenticated: true, loading: false, profile: { country_code: 'IL', holiday_key: 'christmas' } });
    const { result } = renderHook(() => useHoliday());
    expect(result.current).toMatchObject({ theme: 'christmas', phase: 'preview', resolved: true });
    expect(html.classList.contains('holiday-hanukkah')).toBe(false);
    expect(document.cookie).toContain('lx_holiday=christmas');
  });

  it('given a null profile holiday, leaves a landing-link cookie alone', () => {
    vi.setSystemTime(new Date('2026-12-06T12:00:00'));
    document.cookie = 'lx_holiday=hanukkah; path=/';
    html.classList.add('holiday-hanukkah', 'holiday-live');
    html.setAttribute('data-holiday-region', 'world');
    Object.assign(auth, { isAuthenticated: true, loading: false, profile: { country_code: 'US', holiday_key: null } });
    const { result } = renderHook(() => useHoliday());
    expect(result.current.theme).toBe('hanukkah');
    expect(document.cookie).toContain('lx_holiday=hanukkah');
  });

  it('given a guest, offers no swap', () => {
    vi.setSystemTime(new Date('2026-12-06T12:00:00'));
    html.classList.add('holiday-christmas', 'holiday-live');
    html.setAttribute('data-holiday-region', 'world');
    expect(renderHook(() => useHoliday()).result.current.canSwap).toBe(false);
  });

  it('given a signed-in player after Hanukkah ends, offers no swap to a closed holiday', () => {
    vi.setSystemTime(new Date('2026-12-20T12:00:00'));
    html.classList.add('holiday-christmas', 'holiday-live');
    html.setAttribute('data-holiday-region', 'world');
    Object.assign(auth, { isAuthenticated: true, loading: false, profile: { country_code: 'US' } });
    expect(renderHook(() => useHoliday()).result.current.canSwap).toBe(false);
  });

  it('swap flips the html class at once, mirrors the cookie and saves the other holiday on the profile', async () => {
    vi.setSystemTime(new Date('2026-12-06T12:00:00'));
    html.classList.add('holiday-christmas', 'holiday-live');
    html.setAttribute('data-holiday-region', 'world');
    Object.assign(auth, { isAuthenticated: true, loading: false, profile: { country_code: 'US' } });
    const { result } = renderHook(() => useHoliday());
    expect(result.current.canSwap).toBe(true);
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.swap();
    });
    expect(ok).toBe(true);
    expect(updateProfile).toHaveBeenCalledWith({ holiday_key: 'hanukkah' });
    expect(html.classList.contains('holiday-hanukkah')).toBe(true);
    expect(html.classList.contains('holiday-christmas')).toBe(false);
    expect(document.cookie).toContain('lx_holiday=hanukkah');
    expect(result.current.theme).toBe('hanukkah');
  });

  it('given the save fails, swap puts the previous holiday back', async () => {
    vi.setSystemTime(new Date('2026-12-06T12:00:00'));
    html.classList.add('holiday-christmas', 'holiday-live');
    html.setAttribute('data-holiday-region', 'world');
    Object.assign(auth, { isAuthenticated: true, loading: false, profile: { country_code: 'US' } });
    updateProfile.mockResolvedValue({ data: null, error: { message: 'nope' } });
    const { result } = renderHook(() => useHoliday());
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.swap();
    });
    expect(ok).toBe(false);
    expect(result.current.theme).toBe('christmas');
    expect(html.classList.contains('holiday-christmas')).toBe(true);
    expect(document.cookie).toContain('lx_holiday=christmas');
  });
});

describe('keepHolidayClass', () => {
  it('re-adds the holiday class when React rewrites the html className', async () => {
    vi.useRealTimers();
    html.classList.add('holiday-christmas');
    const stop = keepHolidayClass();
    html.className = 'dark font-he';
    await new Promise((r) => setTimeout(r, 0));
    expect(html.classList.contains('holiday-christmas')).toBe(true);
    stop();
  });
});

describe('useHoliday with an es page', () => {
  it('keeps christmas available on Jan 6 for es and not for en', () => {
    vi.setSystemTime(new Date('2027-01-06T12:00:00'));
    html.lang = 'es';
    expect(renderHook(() => useHoliday()).result.current.available).toEqual(['christmas']);
    html.lang = 'en';
    __resetHolidayStore();
    expect(renderHook(() => useHoliday()).result.current.available).toEqual([]);
  });
});
