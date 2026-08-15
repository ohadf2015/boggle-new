import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QuickPlayResults } from '../QuickPlayResults';
import type { QuickRoundResult, QuickSubmitOutcome } from '../types';

// --- Mocks ---
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));
vi.mock('@/utils/haptics/HapticsManager', () => ({ haptics: { success: vi.fn() } }));
vi.mock('@/components/daily/RivalCompareCard', () => ({
  default: () => <div data-testid="mock-rival-card" />,
}));
vi.mock('@/hooks/useReducedMotion', () => ({
  __esModule: true,
  default: vi.fn(() => false),
}));

const result: QuickRoundResult = {
  mode: 'blast',
  seed: 's-1',
  score: 340,
  perfectScore: 500,
  scorePct: 68,
  wordsFound: 7,
  totalWords: 12,
  durationMs: 60000,
};

const outcome: QuickSubmitOutcome = {
  scorePct: 68,
  coins: 93,
  xp: 74,
  percentileToday: 73,
  history: [68, 50, 40], // Has prior rounds, so 68 is a personal best
  totalPoints: 900,
};

describe('QuickPlayResults redesign', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: async () => ({ entries: [] }) })));
  });

  // Existing tests — must stay green
  it('moves focus to its own heading on mount', async () => {
    render(
      <QuickPlayResults result={result} outcome={outcome} rival={null} onNextRound={vi.fn()} onChallenge={vi.fn()} />
    );
    await waitFor(() => expect(document.activeElement).toBe(screen.getByText('quickPlay.solo.roundComplete')));
  });

  it('colors the gauge and mode pill per the mode played', () => {
    render(
      <QuickPlayResults result={result} outcome={outcome} rival={null} onNextRound={vi.fn()} onChallenge={vi.fn()} />
    );
    const pill = screen.getByText('quickPlay.solo.mode.blast');
    expect(pill.className).toContain('bg-neo-pink');
  });

  it('shows a near-miss nudge at 85-99% when this round is not a personal best', () => {
    const nearMissResult: QuickRoundResult = { ...result, scorePct: 92 };
    const nearMissOutcome: QuickSubmitOutcome = { ...outcome, scorePct: 92, history: [92] };
    render(
      <QuickPlayResults
        result={nearMissResult}
        outcome={nearMissOutcome}
        rival={null}
        onNextRound={vi.fn()}
        onChallenge={vi.fn()}
      />
    );
    expect(screen.getByTestId('quick-near-miss')).toHaveTextContent('quickPlay.solo.nearMiss');
  });

  it('hides the near-miss nudge on a personal best', () => {
    const bestResult: QuickRoundResult = { ...result, scorePct: 92 };
    const bestOutcome: QuickSubmitOutcome = { ...outcome, scorePct: 92, history: [92, 50, 40] };
    render(
      <QuickPlayResults
        result={bestResult}
        outcome={bestOutcome}
        rival={null}
        onNextRound={vi.fn()}
        onChallenge={vi.fn()}
      />
    );
    expect(screen.queryByTestId('quick-near-miss')).not.toBeInTheDocument();
  });

  it('hides the near-miss nudge below the 85% threshold', () => {
    render(
      <QuickPlayResults result={result} outcome={outcome} rival={null} onNextRound={vi.fn()} onChallenge={vi.fn()} />
    );
    expect(screen.queryByTestId('quick-near-miss')).not.toBeInTheDocument();
  });

  // New redesign tests
  it('hero displays percentage as the dominant element', () => {
    render(
      <QuickPlayResults result={result} outcome={outcome} rival={null} onNextRound={vi.fn()} onChallenge={vi.fn()} />
    );
    const percentageDisplay = screen.getByTestId('quick-hero-percentage');
    // Hero percentage should have a large size class
    expect(percentageDisplay.className).toMatch(/text-3xl|text-4xl|text-5xl|text-6xl/);
  });

  it('hero includes ofPerfect label with the percentage', () => {
    render(
      <QuickPlayResults result={result} outcome={outcome} rival={null} onNextRound={vi.fn()} onChallenge={vi.fn()} />
    );
    const hero = screen.getByTestId('quick-hero-card');
    expect(hero).toHaveTextContent('quickPlay.solo.ofPerfect');
  });

  it('hero pulls betterThan comparison into the main card', () => {
    render(
      <QuickPlayResults result={result} outcome={outcome} rival={null} onNextRound={vi.fn()} onChallenge={vi.fn()} />
    );
    const hero = screen.getByTestId('quick-hero-card');
    expect(hero).toHaveTextContent('quickPlay.solo.betterThan');
  });

  it('hero displays score and points label', () => {
    render(
      <QuickPlayResults result={result} outcome={outcome} rival={null} onNextRound={vi.fn()} onChallenge={vi.fn()} />
    );
    const hero = screen.getByTestId('quick-hero-card');
    expect(hero).toHaveTextContent('quickPlay.solo.points');
    expect(hero).toHaveTextContent('340');
  });

  it('does not display the wordsFound line', () => {
    render(
      <QuickPlayResults result={result} outcome={outcome} rival={null} onNextRound={vi.fn()} onChallenge={vi.fn()} />
    );
    // The specific wordsFound string should not appear
    expect(screen.queryByText(/7 \/ 12 words found/)).not.toBeInTheDocument();
  });

  it('coins reward is not a full-width slab', () => {
    render(
      <QuickPlayResults result={result} outcome={outcome} rival={null} onNextRound={vi.fn()} onChallenge={vi.fn()} />
    );
    const coinsReward = screen.getByTestId('quick-coins-reward');
    // Should be a small chip, not flex-1 or full-width
    expect(coinsReward.className).not.toContain('flex-1');
  });

  it('xp reward is not a full-width slab', () => {
    render(
      <QuickPlayResults result={result} outcome={outcome} rival={null} onNextRound={vi.fn()} onChallenge={vi.fn()} />
    );
    const xpReward = screen.getByTestId('quick-xp-reward');
    // Should be a small chip, not flex-1 or full-width
    expect(xpReward.className).not.toContain('flex-1');
  });

  it('next-round CTA is the only filled button', () => {
    render(
      <QuickPlayResults result={result} outcome={outcome} rival={null} onNextRound={vi.fn()} onChallenge={vi.fn()} />
    );
    const nextButton = screen.getByTestId('quick-results-next');
    const challengeButton = screen.getByTestId('quick-results-challenge');

    // Next should have a filled background (neo-lime)
    expect(nextButton.className).toContain('bg-neo-lime');

    // Challenge should not have a filled background
    expect(challengeButton.className).not.toContain('bg-neo-lime');
    expect(challengeButton.className).not.toContain('bg-neo-pink');
    expect(challengeButton.className).not.toContain('bg-neo-cyan');
  });

  it('challenge CTA is reachable at 44px minimum height', () => {
    render(
      <QuickPlayResults result={result} outcome={outcome} rival={null} onNextRound={vi.fn()} onChallenge={vi.fn()} />
    );
    const challengeButton = screen.getByTestId('quick-results-challenge');
    // 44px minimum = h-11, or explicit min-h-[44px]
    expect(challengeButton.className).toMatch(/h-\[44px\]|h-11|min-h-\[44px\]|min-h-11/);
  });

  it('see-leaderboard button is reachable at 44px minimum height', () => {
    render(
      <QuickPlayResults result={result} outcome={outcome} rival={null} onNextRound={vi.fn()} onChallenge={vi.fn()} />
    );
    const seeLeaderboardButton = screen.queryByText('quickPlay.solo.seeLeaderboard');
    if (seeLeaderboardButton) {
      const button = seeLeaderboardButton.closest('button');
      expect(button?.className).toMatch(/h-\[44px\]|h-11|min-h-\[44px\]|min-h-11/);
    }
  });

  it('renders with staggered reveal by default', () => {
    render(
      <QuickPlayResults result={result} outcome={outcome} rival={null} onNextRound={vi.fn()} onChallenge={vi.fn()} />
    );
    const container = screen.getByTestId('quick-play-results');
    expect(container).toHaveAttribute('data-reveal', 'staggered');
  });

  // Note: testing reduced motion requires a separate test suite that mocks
  // useReducedMotion to return true, due to vitest mock setup constraints.
  // See: QuickPlayResults.reducedMotion.test.tsx

  it('staggered reveal blocks have animate classes in normal mode', () => {
    render(
      <QuickPlayResults result={result} outcome={outcome} rival={null} onNextRound={vi.fn()} onChallenge={vi.fn()} />
    );
    const heroCard = screen.getByTestId('quick-hero-card');
    // Should have an animate class for stagger
    expect(heroCard.className).toMatch(/animate-\[/);
  });

  it('preserves all existing testids', () => {
    render(
      <QuickPlayResults result={result} outcome={outcome} rival={null} onNextRound={vi.fn()} onChallenge={vi.fn()} />
    );
    expect(screen.getByTestId('quick-play-results')).toBeInTheDocument();
    expect(screen.getByTestId('quick-new-best')).toBeInTheDocument(); // from isPersonalBest badge
    expect(screen.getByTestId('quick-rank-bar')).toBeInTheDocument();
    expect(screen.getByTestId('quick-results-next')).toBeInTheDocument();
    expect(screen.getByTestId('quick-results-challenge')).toBeInTheDocument();
  });

  it('reserves bottom space so push-notification prompt does not cover primary CTA', () => {
    render(
      <QuickPlayResults result={result} outcome={outcome} rival={null} onNextRound={vi.fn()} onChallenge={vi.fn()} />
    );
    const spacer = screen.getByTestId('quick-results-bottom-spacer');
    // The spacer reserves space for the push-notification prompt at fixed bottom-[calc(5rem+var(--admob-banner-height,0px))]
    expect(spacer.className).toContain('h-[calc(5rem+var(--admob-banner-height,0px)+1.5rem)]');
  });

  it('displays betterThan comparison exactly once (in hero, not in rank card)', () => {
    render(
      <QuickPlayResults result={result} outcome={outcome} rival={null} onNextRound={vi.fn()} onChallenge={vi.fn()} />
    );
    // "Better than 73% of today's Quick Play scores" should appear exactly once
    const allText = screen.getByTestId('quick-play-results').textContent || '';
    const matches = (allText.match(/quickPlay\.solo\.betterThan/g) || []).length;
    expect(matches).toBe(1);
  });
});
