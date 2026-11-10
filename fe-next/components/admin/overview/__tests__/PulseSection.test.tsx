import { render, screen, fireEvent, within } from '@testing-library/react';
import { buildPulse } from '@/lib/admin/overviewPulse';
import { PulseSection } from '../PulseSection';

vi.mock('@/hooks/useCountUp', () => ({ useCountUp: ({ target }: { target: number }) => target }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, fb?: string | Record<string, string | number>, p?: Record<string, string | number>) =>
      typeof fb === 'string' ? fb.replace(/\{(\w+)\}/g, (_, n: string) => String(p?.[n] ?? `{${n}}`)) : k,
    language: 'en',
  }),
}));

const DAY = 86_400_000;
const NOW = Date.now();
const daily = Array.from({ length: 60 }, (_, i) => {
  const d = 59 - i;
  const total = d < 7 ? 60 : 40;
  return { date: new Date(NOW - d * DAY).toISOString().slice(0, 10), games: total / 2, guestGames: total / 2, totalGames: total, uniquePlayers: 10, uniqueGuests: 0, totalUniquePlayers: 10 };
});
const pulse = buildPulse({
  nowMs: NOW,
  windowDays: 7,
  daily,
  growth: [],
  stats: { activity: { uniquePlayersMonth: 40 } },
  revenue: { paying: 3, trialing: 1, pastDue: 2, checkoutsStarted30d: 5, paidOrders30d: 2 },
  health: null,
  unreadReports: 2,
});
const STATS = { overview: { totalPlayers: 1200, totalGuests: 300, totalGames: 9000, totalWords: 1, totalGameTimeHours: 450.4 }, activity: { gamesToday: 1, uniquePlayersToday: 1, uniquePlayersWeek: 1, uniquePlayersMonth: 40, signupsToday: 1, signupsWeek: 1 }, languages: {} };

const props = { pulse, windowDays: 7 as const, onWindowChange: vi.fn(), failed: false, onRetry: vi.fn(), stats: STATS, revenue: { paying: 3, trialing: 1, paidOrders30d: 2 } };

describe('PulseSection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the headline tiles with the change in words', () => {
    render(<PulseSection {...props} />);
    expect(within(screen.getByTestId('pulse-games')).getByText('420')).toBeInTheDocument();
    expect(screen.getByTestId('pulse-games-delta').textContent).toBe('+50% vs the previous 7 days (was 280)');
    expect(within(screen.getByTestId('pulse-signedin')).getByText('50%')).toBeInTheDocument();
    expect(within(screen.getByTestId('pulse-paying')).getByText('3')).toBeInTheDocument();
    expect(screen.getByTestId('pulse-paying').textContent).toContain('1 in a trial');
  });

  it('says there is not enough history instead of showing a made-up number', () => {
    render(<PulseSection {...props} />);
    expect(within(screen.getByTestId('pulse-signups')).getByText('Not enough history yet.')).toBeInTheDocument();
  });

  it('turns the numbers into findings: wins, early warnings and the busiest day', () => {
    render(<PulseSection {...props} />);
    expect(within(screen.getByTestId('findings-working')).getByText(/People are playing 50% more/)).toBeInTheDocument();
    const early = screen.getByTestId('findings-early');
    expect(within(early).getByText('Unread user reports to review: 2.')).toBeInTheDocument();
    expect(within(early).getByText('Subscriptions with a failed payment: 2.')).toBeInTheDocument();
    expect(within(screen.getByTestId('findings-facts')).getByText(/was the busiest day: 60 games/)).toBeInTheDocument();
  });

  it('the window toggle reports the choice', () => {
    render(<PulseSection {...props} />);
    expect(screen.getByRole('button', { name: 'Last 7 days' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Last 30 days' }));
    expect(props.onWindowChange).toHaveBeenCalledWith(30);
  });

  it('a tile jumps to the chart behind its number', () => {
    const el = document.createElement('div');
    el.id = 'overview-daily';
    el.scrollIntoView = vi.fn();
    document.body.appendChild(el);
    render(<PulseSection {...props} />);
    fireEvent.click(within(screen.getByTestId('pulse-games')).getByText('Games played'));
    expect(el.scrollIntoView).toHaveBeenCalled();
    el.remove();
  });

  it('shows lifetime totals under the tiles', () => {
    render(<PulseSection {...props} />);
    const totals = screen.getByTestId('pulse-totals');
    expect(totals.textContent).toContain('1,200');
    expect(totals.textContent).toContain('9,000');
    expect(totals.textContent).toContain('450');
  });

  it('shows a skeleton while loading and a retry when the data could not load', () => {
    const { rerender } = render(<PulseSection {...props} pulse={null} />);
    expect(screen.getAllByTestId('pulse-skeleton')).toHaveLength(6);
    rerender(<PulseSection {...props} pulse={null} failed />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(props.onRetry).toHaveBeenCalled();
  });
});
