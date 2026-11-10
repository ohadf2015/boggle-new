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

const props = { pulse, windowDays: 7 as const, onWindowChange: vi.fn(), failed: false, onRetry: vi.fn(), onOpenSection: vi.fn(), stats: STATS, revenue: { paying: 3, trialing: 1, paidOrders30d: 2 } };

describe('PulseSection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the headline tiles with the change in words', () => {
    render(<PulseSection {...props} />);
    expect(within(screen.getByTestId('pulse-games')).getByText('420')).toBeInTheDocument();
    expect(screen.getByTestId('pulse-games-delta').textContent).toBe('\u2066+50%\u2069 vs the previous 7 days (was 280)');
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

  it('a tile opens the drill-down behind its number', () => {
    const onOpenSection = vi.fn();
    render(<PulseSection {...props} onOpenSection={onOpenSection} />);
    fireEvent.click(within(screen.getByTestId('pulse-games')).getByText('Games played'));
    expect(onOpenSection).toHaveBeenCalledWith('overview-daily');
    fireEvent.click(within(screen.getByTestId('pulse-paying')).getByText('Paying customers'));
    expect(onOpenSection).toHaveBeenCalledWith('overview-revenue');
  });

  it('offers today vs yesterday first and reports the choice', () => {
    render(<PulseSection {...props} />);
    const buttons = screen.getAllByRole('button').filter((b) => b.hasAttribute('aria-pressed'));
    expect(buttons.map((b) => b.textContent)).toEqual(['Today vs yesterday', 'Last 7 days', 'Last 30 days']);
    fireEvent.click(buttons[0]);
    expect(props.onWindowChange).toHaveBeenCalledWith(1);
  });

  it('in the day view shows pace against yesterday and drops stickiness', () => {
    const evening = Date.parse(new Date(NOW).toISOString().slice(0, 10) + 'T18:00:00Z');
    const dayPulse = buildPulse({
      nowMs: evening,
      windowDays: 1,
      daily: daily.map((r, i, all) => ({ ...r, totalGames: i === all.length - 1 ? 30 : i === all.length - 2 ? 40 : r.totalGames, signups: 2 })),
      growth: [],
      stats: { activity: { uniquePlayersMonth: 40 } },
      revenue: null,
      health: null,
      unreadReports: 0,
    });
    render(<PulseSection {...props} pulse={dayPulse} windowDays={1} />);
    expect(within(screen.getByTestId('pulse-games')).getByText('Games today')).toBeInTheDocument();
    expect(screen.getByTestId('pulse-games-delta').textContent).toBe('At this pace: 40 · \u20660%\u2069 vs yesterday (40)');
    expect(screen.queryByTestId('pulse-stickiness')).not.toBeInTheDocument();
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
