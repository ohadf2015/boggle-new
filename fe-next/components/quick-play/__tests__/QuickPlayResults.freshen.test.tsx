import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { QuickPlayResults } from '../QuickPlayResults';
import { isQuickResultsOnScreen } from '@/lib/quickPlay/resultsCalm';
import type { QuickRoundResult, QuickSubmitOutcome } from '../types';

const auth = vi.hoisted(() => ({ user: null as null | { id: string }, profile: null as null | Record<string, unknown> }));
const guestAvatar = vi.hoisted(() => ({ face: 'guest-face' }));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/utils/haptics/HapticsManager', () => ({ haptics: { success: vi.fn() } }));
vi.mock('@/components/daily/RivalCompareCard', () => ({ default: () => null }));
vi.mock('@/hooks/useReducedMotion', () => ({ __esModule: true, default: vi.fn(() => false) }));
vi.mock('@/utils/profileStorage', () => ({ getOrCreateStoredCustomAvatar: () => guestAvatar }));
vi.mock('@/lib/quickPlay/guestProgress', async (orig) => ({
  ...(await orig<typeof import('@/lib/quickPlay/guestProgress')>()),
  getGuestProgress: () => ({ coinsPending: 300 }),
}));
vi.mock('@/components/Avatar', () => ({
  default: ({ customAvatar, userId }: { customAvatar?: { face?: string }; userId?: string }) => (
    <span data-testid="avatar" data-face={customAvatar?.face ?? ''} data-seed={userId ?? ''} />
  ),
}));

const result: QuickRoundResult = {
  mode: 'wheel-rush',
  seed: 's-2',
  score: 900,
  perfectScore: 1000,
  scorePct: 90,
  wordsFound: 9,
  totalWords: 12,
  durationMs: 60000,
};

const outcome: QuickSubmitOutcome = {
  scorePct: 90,
  coins: 120,
  xp: 80,
  percentileToday: 95,
  history: [90, 40, 30],
  totalPoints: 1200,
};

function renderResults(over: Partial<QuickRoundResult> = {}, out: Partial<QuickSubmitOutcome> = {}, isGuest = true) {
  return render(
    <QuickPlayResults
      result={{ ...result, ...over }}
      outcome={{ ...outcome, ...out }}
      rival={null}
      isGuest={isGuest}
      onNextRound={() => undefined}
      onChallenge={() => undefined}
    />
  );
}

describe('QuickPlayResults freshen', () => {
  beforeEach(() => {
    auth.user = null;
    auth.profile = null;
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: async () => ({ entries: [] }) })));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("puts a guest's own stored avatar front and center", () => {
    renderResults();
    const hero = screen.getByTestId('quick-hero-avatar');
    expect(hero.querySelector('[data-testid="avatar"]')).toHaveAttribute('data-face', 'guest-face');
  });

  it("puts a signed-in player's profile avatar front and center", () => {
    auth.user = { id: 'u-1' };
    auth.profile = { username: 'ohad', avatar_config: { face: 'mine' }, total_coins: 50 };
    renderResults({}, {}, false);
    const avatar = screen.getByTestId('quick-hero-avatar').querySelector('[data-testid="avatar"]');
    expect(avatar).toHaveAttribute('data-face', 'mine');
    expect(avatar).toHaveAttribute('data-seed', 'u-1');
  });

  it('turns the light rays behind the hero and plays a small confetti puff', () => {
    renderResults();
    expect(screen.getByTestId('quick-results-rays')).toHaveAttribute('data-spinning', 'true');
    expect(screen.getByTestId('quick-confetti')).toBeInTheDocument();
    expect(screen.getByTestId('quick-results-sparkles')).toBeInTheDocument();
  });

  it('keeps the confetti for rounds that found something', () => {
    renderResults({ scorePct: 0, score: 0, wordsFound: 0 }, { scorePct: 0, coins: 10 });
    expect(screen.queryByTestId('quick-confetti')).toBeNull();
  });

  it("flies the earned coins into a guest's held wallet", () => {
    renderResults();
    const wallet = screen.getByTestId('quick-wallet');
    expect(wallet).toHaveAttribute('data-from', '180');
    expect(wallet).toHaveAttribute('data-to', '300');
    expect(screen.getByTestId('quick-coin-flight')).toBeInTheDocument();
  });

  it("adds the earned coins on top of a signed-in player's balance", () => {
    auth.user = { id: 'u-1' };
    auth.profile = { username: 'ohad', total_coins: 50 };
    renderResults({}, {}, false);
    const wallet = screen.getByTestId('quick-wallet');
    expect(wallet).toHaveAttribute('data-from', '50');
    expect(wallet).toHaveAttribute('data-to', '170');
  });

  it('flies no coins on a round that earned none', () => {
    renderResults({}, { coins: 0 });
    expect(screen.queryByTestId('quick-coin-flight')).toBeNull();
  });

  it('pins one primary action outside the scrolling details', () => {
    renderResults();
    const bar = screen.getByTestId('quick-results-cta-bar');
    expect(bar).toContainElement(screen.getByTestId('quick-results-next'));
    expect(screen.getByTestId('quick-results-scroll')).not.toContainElement(bar);
    expect(bar.querySelectorAll('button.bg-neo-lime')).toHaveLength(1);
  });

  it('caps the screen at the viewport so the pinned action stays on screen on desktop', () => {
    renderResults();
    expect(screen.getByTestId('quick-play-results').className).toContain('max-h-[100dvh]');
  });

  it('hides the floating feedback launcher while the results are up, so it never sits on the pinned buttons', () => {
    const { unmount } = renderResults();
    expect(document.body.classList.contains('quick-results-open')).toBe(true);
    unmount();
    expect(document.body.classList.contains('quick-results-open')).toBe(false);
  });

  it('keeps the primary action clear of the app tab bar', () => {
    renderResults();
    expect(screen.getByTestId('quick-results-cta-bar').className).toContain('var(--bottom-nav-height');
  });

  it('lists the mode switch after the rank card, so the pinned button stays the one obvious next step', () => {
    renderResults();
    const rank = screen.getByTestId('quick-rank-bar');
    const picker = screen.getByTestId('quick-next-mode-picker');
    expect(rank.compareDocumentPosition(picker) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('moves the mode switcher and standings into the details below the hero', () => {
    renderResults();
    const details = screen.getByTestId('quick-results-details');
    expect(details).toContainElement(screen.getByTestId('quick-next-mode-picker'));
    expect(details).toContainElement(screen.getByTestId('quick-rank-bar'));
  });

  it('holds the signup nudge through the celebration, then lets it through', () => {
    vi.useFakeTimers();
    const { unmount } = renderResults();
    expect(isQuickResultsOnScreen()).toBe(true);
    act(() => vi.advanceTimersByTime(5500));
    expect(isQuickResultsOnScreen()).toBe(true);
    act(() => vi.advanceTimersByTime(1000));
    expect(isQuickResultsOnScreen()).toBe(false);
    unmount();
  });
});
