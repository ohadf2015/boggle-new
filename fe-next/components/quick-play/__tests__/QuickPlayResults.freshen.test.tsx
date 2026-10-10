import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuickPlayResults } from '../QuickPlayResults';
import { fireConfetti } from '@/utils/confettiUtils';
import { isQuickResultsOnScreen } from '@/lib/quickPlay/resultsCalm';
import type { QuickRoundResult, QuickSubmitOutcome } from '../types';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null }),
}));
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));
vi.mock('@/utils/haptics/HapticsManager', () => ({ haptics: { success: vi.fn() } }));
vi.mock('@/components/daily/RivalCompareCard', () => ({ default: () => null }));
vi.mock('@/hooks/useReducedMotion', () => ({
  __esModule: true,
  default: vi.fn(() => false),
}));

const result: QuickRoundResult = {
  mode: 'classic',
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

function renderResults() {
  return render(
    <QuickPlayResults
      result={result}
      outcome={outcome}
      rival={null}
      onNextRound={() => undefined}
      onChallenge={() => undefined}
    />
  );
}

describe('QuickPlayResults freshen', () => {
  beforeEach(() => {
    vi.mocked(fireConfetti).mockClear();
  });

  it('shows the player avatar in the hero, seeded for guests too', () => {
    renderResults();
    expect(screen.getByTestId('quick-hero-avatar')).toBeInTheDocument();
  });

  it('plays gentle sparkles and light rays instead of confetti on a big round', () => {
    renderResults();
    expect(screen.getByTestId('quick-results-rays')).toBeInTheDocument();
    expect(screen.getByTestId('quick-results-sparkles')).toBeInTheDocument();
    expect(fireConfetti).not.toHaveBeenCalled();
  });

  it('launches a coin flight toward the coins chip', () => {
    renderResults();
    expect(screen.getByTestId('quick-coin-flight')).toBeInTheDocument();
  });

  it('flies no coins on a round that earned none', () => {
    render(
      <QuickPlayResults
        result={result}
        outcome={{ ...outcome, coins: 0 }}
        rival={null}
        onNextRound={() => undefined}
        onChallenge={() => undefined}
      />
    );
    expect(screen.queryByTestId('quick-coin-flight')).toBeNull();
  });

  it('keeps the next-round CTA above the rank and rivals cards', () => {
    renderResults();
    const cta = screen.getByTestId('quick-results-next');
    const rank = screen.getByTestId('quick-rank-bar');
    expect(cta.compareDocumentPosition(rank) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('marks the results screen on while mounted so the signup nudge holds back', () => {
    const { unmount } = renderResults();
    expect(isQuickResultsOnScreen()).toBe(true);
    unmount();
    expect(isQuickResultsOnScreen()).toBe(false);
  });
});
