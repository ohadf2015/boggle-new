import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { LobbyDailyEmber } from '../LobbyDailyEmber';

const capture = vi.fn();

vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: (...a: unknown[]) => capture(...a) } }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (k: string, vars?: Record<string, unknown>) => (vars ? `${k}:${JSON.stringify(vars)}` : k),
  }),
}));

const dailyStatus = { hasPlayed: false, currentStreak: 0, loading: false };
vi.mock('@/hooks/useDailyChallengeStatus', () => ({
  useDailyChallengeStatus: () => dailyStatus,
}));

beforeEach(() => {
  capture.mockClear();
  dailyStatus.hasPlayed = false;
  dailyStatus.currentStreak = 0;
  dailyStatus.loading = false;
});

describe('LobbyDailyEmber', () => {
  it('renders nothing while daily status is loading', () => {
    dailyStatus.loading = true;
    const { container } = render(<LobbyDailyEmber />);
    expect(container.firstChild).toBeNull();
    expect(capture).not.toHaveBeenCalled();
  });

  it('shows the INVITE ember (awareness) for a player with no streak', () => {
    render(<LobbyDailyEmber />);
    const chip = screen.getByTestId('lobby-daily-ember');
    expect(chip).toHaveAttribute('data-kind', 'invite');
    expect(chip).toHaveTextContent('lobbyDailyEmber.invite');
  });

  it('shows the AT_RISK ember with the live streak when not yet played today', () => {
    dailyStatus.currentStreak = 7;
    render(<LobbyDailyEmber />);
    const chip = screen.getByTestId('lobby-daily-ember');
    expect(chip).toHaveAttribute('data-kind', 'at_risk');
    expect(chip).toHaveTextContent('"streak":7');
  });

  it('shows the SECURED ember once today is played', () => {
    dailyStatus.hasPlayed = true;
    dailyStatus.currentStreak = 3;
    render(<LobbyDailyEmber />);
    expect(screen.getByTestId('lobby-daily-ember')).toHaveAttribute('data-kind', 'secured');
  });

  it('fires a single impression event with the kind on mount', () => {
    dailyStatus.currentStreak = 5;
    render(<LobbyDailyEmber />);
    const shown = capture.mock.calls.filter((c) => c[0] === 'growth:lobby_daily_ember_shown');
    expect(shown).toHaveLength(1);
    expect(shown[0][1]).toMatchObject({ kind: 'at_risk', streak: 5, surface: 'mp_lobby' });
  });

  it('opening the popover fires a tapped event and shows reassurance copy', () => {
    render(<LobbyDailyEmber />);
    fireEvent.click(screen.getByTestId('lobby-daily-ember'));
    expect(screen.getByTestId('lobby-daily-ember-popover')).toBeInTheDocument();
    const tapped = capture.mock.calls.filter((c) => c[0] === 'growth:lobby_daily_ember_tapped');
    expect(tapped).toHaveLength(1);
  });

  it('NEVER offers a link that leaves the room (no anchor/href in the popover)', () => {
    render(<LobbyDailyEmber />);
    fireEvent.click(screen.getByTestId('lobby-daily-ember'));
    const popover = screen.getByTestId('lobby-daily-ember-popover');
    expect(within(popover).queryByRole('link')).toBeNull();
    expect(popover.querySelector('a')).toBeNull();
  });

  it('"Got it" dismisses the popover', () => {
    render(<LobbyDailyEmber />);
    fireEvent.click(screen.getByTestId('lobby-daily-ember'));
    fireEvent.click(screen.getByTestId('lobby-daily-ember-gotit'));
    expect(screen.queryByTestId('lobby-daily-ember-popover')).toBeNull();
  });
});
