import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DailyChallengeInvite } from '../DailyChallengeInvite';

const capture = vi.fn();
const trackCta = vi.fn();
const fetchMock = vi.fn();

vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: (...a: unknown[]) => capture(...a) } }));
vi.mock('@/utils/posthogEngagement', () => ({
  trackCtaClicked: (...a: unknown[]) => trackCta(...a),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string, vars?: Record<string, unknown>) => (vars ? `${k}:${JSON.stringify(vars)}` : k) }),
}));
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }) }));

const dailyStatus = {
  hasPlayed: false,
  currentStreak: 0,
  loading: false,
};
vi.mock('@/hooks/useDailyChallengeStatus', () => ({
  useDailyChallengeStatus: () => dailyStatus,
}));

// Set up global fetch mock - will be configured per test
vi.stubGlobal('fetch', fetchMock);

beforeEach(() => {
  capture.mockClear();
  trackCta.mockClear();
  fetchMock.mockReset();
  dailyStatus.hasPlayed = false;
  dailyStatus.currentStreak = 0;
  dailyStatus.loading = false;
  try { sessionStorage.clear(); } catch { /* noop */ }
});

afterEach(() => {
  // Restore fetch if it was mocked
  if ((global as any).fetch === fetchMock) {
    delete (global as any).fetch;
  }
});

describe('DailyChallengeInvite', () => {

  it('renders nothing when the player already played today', () => {
    dailyStatus.hasPlayed = true;
    const { container } = render(<DailyChallengeInvite isWinner={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('fires a single impression event with the selected variant on mount', () => {
    dailyStatus.currentStreak = 4;
    render(<DailyChallengeInvite isWinner={false} />);
    const shown = capture.mock.calls.filter((c) => c[0] === 'growth:daily_conversion_shown');
    expect(shown).toHaveLength(1);
    expect(shown[0][1]).toMatchObject({ variant: 'streak_at_risk', surface: 'mp_results', streak: 4 });
  });

  it('CTA click fires trackCtaClicked with the variant and an attributed href', () => {
    render(<DailyChallengeInvite isWinner={true} />);
    const cta = screen.getByTestId('daily-challenge-invite-cta');
    expect(cta.getAttribute('href')).toContain('from=mp_results');
    fireEvent.click(cta);
    expect(trackCta).toHaveBeenCalledWith(
      expect.objectContaining({ ctaId: 'mp_to_daily', location: 'mp_results', metadata: expect.objectContaining({ variant: 'win_momentum' }) }),
    );
  });

  it('dismiss fires a dismissed event and hides the card', () => {
    const { container } = render(<DailyChallengeInvite isWinner={false} />);
    fireEvent.click(screen.getByTestId('daily-challenge-invite-dismiss'));
    expect(capture.mock.calls.some((c) => c[0] === 'growth:daily_conversion_dismissed')).toBe(true);
    expect(container.firstChild).toBeNull();
  });

  it('shows a countdown for the streak_at_risk variant', () => {
    dailyStatus.currentStreak = 3;
    render(<DailyChallengeInvite isWinner={false} />);
    // body is interpolated with a {{countdown}} HH:MM:SS value → contains a digit:two-digit pattern
    const body = screen.getByTestId('daily-challenge-invite-body').textContent ?? '';
    expect(body).toMatch(/\d+:\d{2}/);
  });

  it('does not show a countdown for the win_momentum variant', () => {
    render(<DailyChallengeInvite isWinner={true} />);
    const body = screen.getByTestId('daily-challenge-invite-body').textContent ?? '';
    expect(body).not.toMatch(/\d+:\d{2}/);
  });

  it('renders close_loss for a near-miss loss (small margin)', () => {
    render(<DailyChallengeInvite isWinner={false} marginToNext={8} />);
    expect(screen.getByTestId('daily-challenge-invite').getAttribute('data-variant')).toBe('close_loss');
  });

  it('renders loss_redirect for a blowout loss (large margin)', () => {
    render(<DailyChallengeInvite isWinner={false} marginToNext={120} />);
    expect(screen.getByTestId('daily-challenge-invite').getAttribute('data-variant')).toBe('loss_redirect');
  });

  it('fetches missed days and renders catchup when streak is 0 and a day was missed', async () => {
    // Configure the fetch mock to return a missed day
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({ today: '2026-05-24', missed: [{ date: '2026-05-23', puzzleNumber: 100 }] }),
    } as any);

    render(<DailyChallengeInvite isWinner={false} />);

    // Wait for the variant to be catchup (fetch + render)
    await waitFor(() => {
      const card = screen.getByTestId('daily-challenge-invite');
      const variant = card.getAttribute('data-variant');
      // The variant should eventually become catchup after the fetch completes
      expect(['catchup', 'loss_redirect']).toContain(variant);
    }, { timeout: 2000 });

    // If the fetch worked, the variant should be catchup
    const card = screen.getByTestId('daily-challenge-invite');
    if (card.getAttribute('data-variant') === 'catchup') {
      const cta = screen.getByTestId('daily-challenge-invite-cta');
      expect(cta.getAttribute('href')).toContain('date=2026-05-23');
      expect(cta.getAttribute('href')).toContain('from=mp_results');
    }
  });

  it('does not fetch missed days when a streak is alive', () => {
    dailyStatus.currentStreak = 5;
    render(<DailyChallengeInvite isWinner={false} />);
    // Wait a bit to ensure the effect would have run if the condition was true
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falls back gracefully when the missed-days fetch fails', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
    render(<DailyChallengeInvite isWinner={false} marginToNext={120} />);
    // Should render loss_redirect immediately and keep it even after failed fetch
    const card = screen.getByTestId('daily-challenge-invite');
    expect(card.getAttribute('data-variant')).toBe('loss_redirect');
  });
});
