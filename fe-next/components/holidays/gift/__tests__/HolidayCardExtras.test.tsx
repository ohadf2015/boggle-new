import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => new Proxy({}, { get: () => vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en' }),
}));
vi.mock('@/hooks/useHoliday', () => ({ useHoliday: () => ({ region: 'IL' }) }));
vi.mock('@/utils/onboardingStorage', () => ({ hasSupabaseSession: () => true }));

import HolidayCardExtras from '../HolidayCardExtras';
import { resetHolidayClientForTests } from '@/lib/holidays/holidayClient';
import { buildProgressView } from '@/lib/holidayEvent/progressView';
import { windowFor } from '@/lib/holidays/calendar';

const win = windowFor('hanukkah', '2026-12-05')!;
const fetchMock = vi.fn();

function serve(gift: unknown, hunt: unknown) {
  fetchMock.mockImplementation(async (url: string) => ({
    ok: true,
    json: async () => (String(url).includes('/gift') ? gift : hunt),
  }));
}

describe('HolidayCardExtras', () => {
  beforeEach(() => {
    resetHolidayClientForTests();
    document.documentElement.className = 'holiday-hanukkah';
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 11, 9, 12, 0));
    vi.stubGlobal('fetch', fetchMock);
  });

  it('Given nights 1,2,4 lit on night 6, then the gift is tier 3, stalled, and the comeback asks for 2 more games for night 5', async () => {
    serve({ opened: null, gamesToday: 1, comebackUsed: false }, { slot: 'friends', item: 'gelt', foundToday: false, count: 2, goal: 8, seeker: false });
    render(<HolidayCardExtras holiday="hanukkah" win={win} today="2026-12-09" view={buildProgressView(win, new Set([0, 1, 3]))} locale="en" />);
    await waitFor(() => expect(screen.getByTestId('mystery-gift-img')).toBeInTheDocument());
    expect(screen.getByTestId('mystery-gift-img').getAttribute('src')).toBe('/holidays/gift-tier-3.webp');
    expect(screen.getByText('holiday.gift.stalled')).toBeInTheDocument();
    expect(screen.getByTestId('holiday-comeback').textContent).toContain('"day":5');
    expect(screen.getByTestId('holiday-comeback').textContent).toContain('"count":2');
    await waitFor(() => expect(screen.getByTestId('holiday-hunt-hint').textContent).toContain('holiday.hunt.hint.friends'));
    expect(screen.queryByText('holiday.wrapped.cta')).toBeNull();
    expect(screen.getByTestId('holiday-candles').textContent).toContain('"count":10');
    expect(screen.queryByTestId('holiday-zot')).toBeNull();
  });

  it('Given the gift state cannot load, then a retry shows instead of a silent empty card', async () => {
    fetchMock.mockImplementation(async (url: string) => (String(url).includes('/gift') ? { ok: false, json: async () => ({}) } : { ok: true, json: async () => null }));
    render(<HolidayCardExtras holiday="hanukkah" win={win} today="2026-12-09" view={buildProgressView(win, new Set([0]))} locale="en" />);
    await waitFor(() => expect(screen.getByText('holiday.event.loadError')).toBeInTheDocument());
    serve({ opened: null, gamesToday: 0, comebackUsed: false }, null);
    screen.getByRole('button', { name: 'holiday.event.retry' }).click();
    await waitFor(() => expect(screen.getByTestId('mystery-gift')).toBeInTheDocument());
  });

  it('Given night 8 with the crown lit and Seeker earned, then both titles show and Wrapped opens', async () => {
    serve({ opened: null, gamesToday: 0, comebackUsed: true }, { slot: 'friends', item: 'gelt', foundToday: true, count: 8, goal: 8, seeker: true });
    vi.setSystemTime(new Date(2026, 11, 11, 12, 0));
    render(<HolidayCardExtras holiday="hanukkah" win={win} today="2026-12-11" view={buildProgressView(win, new Set([0, 1, 2, 3, 4, 5, 6, 7]))} locale="en" />);
    await waitFor(() => expect(screen.getAllByTestId('holiday-title-badge')).toHaveLength(2));
    expect(screen.getByText('holiday.title.keeperOfTheLight')).toBeInTheDocument();
    expect(screen.getByText('holiday.title.seeker')).toBeInTheDocument();
    expect(screen.getByText('holiday.wrapped.cta')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'holiday.gift.openCta' })).toBeInTheDocument();
    expect(screen.queryByTestId('holiday-comeback')).toBeNull();
    expect(screen.getByTestId('holiday-candles').textContent).toContain('"count":44');
    expect(screen.getByTestId('holiday-zot')).toBeInTheDocument();
  });
});
