import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';

const holidayState = vi.fn();
const authState = vi.fn();
vi.mock('@/hooks/useHoliday', () => ({ useHoliday: () => holidayState() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authState() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en' }),
}));
vi.mock('@/components/daily/holiday/HolidayCommunityCounter', () => ({ default: () => <p data-testid="d-community" /> }));
vi.mock('@/components/daily/holiday/HolidayRescueCard', () => ({ default: () => <p data-testid="d-rescue" /> }));
vi.mock('@/components/daily/holiday/HolidayTablePanel', () => ({ default: () => <p data-testid="d-table" /> }));
vi.mock('@/components/auth/AuthModal', () => ({ default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="auth-modal" /> : null) }));

import HolidayEventCard from '../HolidayEventCard';
import { HOLIDAY_PROGRESS_EVENT, resetHolidayPlayedForTests, rememberLitForTests } from '@/lib/holidayEvent/markHolidayPlayed';
import { buildProgressView } from '@/lib/holidayEvent/progressView';
import { windowFor } from '@/lib/holidays/calendar';

const fetchMock = vi.fn();
const hanukkahView = (lit: number[]) => buildProgressView(windowFor('hanukkah', '2026-12-05')!, new Set(lit));

describe('HolidayEventCard', () => {
  beforeEach(() => {
    resetHolidayPlayedForTests();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 11, 5, 12, 0));
    holidayState.mockReturnValue({ holiday: 'hanukkah', resolved: true });
    authState.mockReturnValue({ user: null, loading: false });
    fetchMock.mockReset().mockResolvedValue({ ok: true, json: async () => hanukkahView([0, 1]) });
    vi.stubGlobal('fetch', fetchMock);
  });

  it('Given no active holiday, then nothing renders', () => {
    holidayState.mockReturnValue({ holiday: null, resolved: true });
    const { container } = render(<HolidayEventCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it('Given auth still loading, then nothing renders yet (no guest flash for a signed-in player)', () => {
    authState.mockReturnValue({ user: null, loading: true });
    const { container } = render(<HolidayEventCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it('Given a guest during Hanukkah, then 8 unlit candles show read-only with today marked and a sign-in CTA', async () => {
    render(<HolidayEventCard />);
    const days = screen.getAllByTestId('holiday-day');
    expect(days).toHaveLength(8);
    expect(days.filter((d) => d.getAttribute('data-lit') === 'true')).toHaveLength(0);
    expect(days[1]).toHaveAttribute('aria-current', 'date');
    expect(days[0].querySelector('img')?.getAttribute('src')).toBe('/holidays/props-candle.webp');
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'holiday.event.signInCta' }));
    expect(await screen.findByTestId('auth-modal')).toBeInTheDocument();
  });

  it('Given a signed-in player, then their lit nights come from the server and there is no CTA', async () => {
    authState.mockReturnValue({ user: { id: 'u1' }, loading: false });
    render(<HolidayEventCard />);
    await waitFor(() => expect(screen.getAllByTestId('holiday-day')).toHaveLength(8));
    expect(fetchMock.mock.calls[0][0]).toBe('/api/holiday/progress?holiday=hanukkah&localDate=2026-12-05&locale=en');
    const lit = screen.getAllByTestId('holiday-day').filter((d) => d.getAttribute('data-lit') === 'true');
    expect(lit).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'holiday.event.signInCta' })).toBeNull();
  });

  it('Given tonight was just lit by a finished game, then the reward pops once', async () => {
    authState.mockReturnValue({ user: { id: 'u1' }, loading: false });
    rememberLitForTests({ status: 'lit', index: 1, reward: { partKey: 'accessory:beanieBlue' } });
    render(<HolidayEventCard />);
    expect(await screen.findByTestId('holiday-reward-pop')).toHaveTextContent('holiday.part.beanieBlue');
  });

  it('Given a game finishes while the card is open, then it refetches and pops the reward', async () => {
    authState.mockReturnValue({ user: { id: 'u1' }, loading: false });
    render(<HolidayEventCard />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    act(() => {
      window.dispatchEvent(new CustomEvent(HOLIDAY_PROGRESS_EVENT, { detail: { status: 'lit', index: 1, reward: { coins: 50 } } }));
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByTestId('holiday-reward-pop')).toHaveTextContent('holiday.reward.coins:{"count":50}');
  });

  it('Given the progress read fails, then an error with retry shows (never an empty track)', async () => {
    authState.mockReturnValue({ user: { id: 'u1' }, loading: false });
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    render(<HolidayEventCard />);
    fireEvent.click(await screen.findByRole('button', { name: 'holiday.event.retry' }));
    await waitFor(() => expect(screen.getAllByTestId('holiday-day')).toHaveLength(8));
  });

  it('Given a signed-in preview out of season, then the read-only track shows without a server read', () => {
    authState.mockReturnValue({ user: { id: 'u1' }, loading: false });
    vi.setSystemTime(new Date(2026, 10, 27, 12, 0));
    render(<HolidayEventCard />);
    expect(screen.getAllByTestId('holiday-day')).toHaveLength(8);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'holiday.event.retry' })).toBeNull();
  });

  it('Given Christmas, then 12 gifts show', () => {
    holidayState.mockReturnValue({ holiday: 'christmas', resolved: true });
    vi.setSystemTime(new Date(2026, 11, 15, 12, 0));
    render(<HolidayEventCard />);
    const days = screen.getAllByTestId('holiday-day');
    expect(days).toHaveLength(12);
    expect(days[1]).toHaveAttribute('aria-current', 'date');
  });

  it('Given nights lit by the Holiday Daily and by a friend, then those candles glow and say so', async () => {
    authState.mockReturnValue({ user: { id: 'u1' }, loading: false });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => buildProgressView(windowFor('hanukkah', '2026-12-05')!, new Set([0, 1]), new Map([[0, 'daily'], [1, 'friend']])),
    });
    render(<HolidayEventCard />);
    await waitFor(() => expect(screen.getAllByTestId('holiday-day')[0]).toHaveAttribute('data-source', 'daily'));
    const [daily, friend] = screen.getAllByTestId('holiday-day');
    expect(daily.textContent).toContain('holiday.event.litByDaily');
    expect(friend).toHaveAttribute('data-source', 'friend');
    expect(friend.textContent).toContain('holiday.event.litByFriend');
  });

  it('Given the event is live, then the community counter shows for guests and the rescue and table cards for players', async () => {
    const { unmount } = render(<HolidayEventCard />);
    expect(screen.getByTestId('d-community')).toBeInTheDocument();
    expect(screen.queryByTestId('d-rescue')).toBeNull();
    unmount();
    authState.mockReturnValue({ user: { id: 'u1' }, loading: false });
    render(<HolidayEventCard />);
    await waitFor(() => expect(screen.getByTestId('d-rescue')).toBeInTheDocument());
    expect(screen.getByTestId('d-table')).toBeInTheDocument();
  });
});
