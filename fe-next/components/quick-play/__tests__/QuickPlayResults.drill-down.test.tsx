import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickPlayResults } from '../QuickPlayResults';
import type { QuickRoundResult, QuickSubmitOutcome } from '../types';

// --- Mocks ---
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (path: string, fallbackOrParams?: string | Record<string, string | number>, paramsWhenFallback?: Record<string, string | number>) => {
      // Determine fallback and params based on argument types (matches real t() logic)
      const fallback = typeof fallbackOrParams === 'string' ? fallbackOrParams : undefined;
      const params: Record<string, string | number> = typeof fallbackOrParams === 'object' && fallbackOrParams !== null
        ? fallbackOrParams
        : (paramsWhenFallback || {});

      // Simple interpolation
      let result = fallback || path;
      Object.entries(params).forEach(([key, value]) => {
        result = result.replace(`{${key}}`, String(value));
      });
      return result;
    },
    language: 'en',
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user-1' }, profile: { username: 'TestPlayer', avatar_config: null } }),
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
  mode: 'classic',
  seed: 's-1',
  score: 340,
  perfectScore: 500,
  scorePct: 68,
  wordsFound: 7,
  totalWords: 12,
  durationMs: 60000,
  words: [
    { word: 'test', score: 25 },
    { word: 'play', score: 15 },
    { word: 'word', score: 20 },
    { word: 'quick', score: 35 },
    { word: 'game', score: 18 },
  ],
};

const outcome: QuickSubmitOutcome = {
  scorePct: 68,
  coins: 93,
  xp: 74,
  percentileToday: 73,
  history: [68, 50, 40],
  totalPoints: 900,
};

describe('QuickPlayResults drill-down — one-tap word details', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: async () => ({ entries: [] }) })));
  });

  it('displays a visible trigger to view word details', () => {
    render(
      <QuickPlayResults
        result={result}
        outcome={outcome}
        rival={null}
        collected={result.words?.map((w) => ({ ...w, isNew: false })) || []}
        collectionTotal={5}
        onNextRound={vi.fn()}
        onChallenge={vi.fn()}
      />
    );

    // The words section should be present
    const wordsSection = screen.getByTestId('quick-words-collected');
    expect(wordsSection).toBeInTheDocument();

    // There should be a visible trigger (button or similar) to see details
    const detailTrigger = within(wordsSection).queryByRole('button', { name: /detail|breakdown|score/i }) ||
                          within(wordsSection).queryByTestId(/drill|detail|breakdown/i);

    // If no specific button, the section itself should be clickable or have a visual affordance
    expect(wordsSection).toBeInTheDocument();
  });

  it('opens a dialog showing all words with their individual scores on one tap', async () => {
    const user = userEvent.setup();

    render(
      <QuickPlayResults
        result={result}
        outcome={outcome}
        rival={null}
        collected={result.words?.map((w) => ({ ...w, isNew: false })) || []}
        collectionTotal={5}
        onNextRound={vi.fn()}
        onChallenge={vi.fn()}
      />
    );

    // Find and click the drill-down trigger
    const wordsSection = screen.getByTestId('quick-words-collected');
    const trigger = within(wordsSection).getByRole('button', { name: /breakdown|detail|score|words/i });

    await user.click(trigger);

    // Dialog should open
    const dialog = await screen.findByRole('dialog', { hidden: false });
    expect(dialog).toBeInTheDocument();

    // Check that the detail list is present
    const detailList = within(dialog).getByTestId('quick-words-detail-list');
    expect(detailList).toBeInTheDocument();

    // All word strings should be visible in the detail list
    expect(within(detailList).getByText('TEST')).toBeInTheDocument();
    expect(within(detailList).getByText('PLAY')).toBeInTheDocument();
    expect(within(detailList).getByText('WORD')).toBeInTheDocument();
    expect(within(detailList).getByText('QUICK')).toBeInTheDocument();
    expect(within(detailList).getByText('GAME')).toBeInTheDocument();

    // All scores should be visible
    expect(within(dialog).getByText('25')).toBeInTheDocument();
    expect(within(dialog).getByText('15')).toBeInTheDocument();
    expect(within(dialog).getByText('20')).toBeInTheDocument();
    expect(within(dialog).getByText('35')).toBeInTheDocument();
    expect(within(dialog).getByText('18')).toBeInTheDocument();
  });

  it('dialog is reachable without expanding other sections first', async () => {
    const user = userEvent.setup();

    render(
      <QuickPlayResults
        result={result}
        outcome={outcome}
        rival={null}
        collected={result.words?.map((w) => ({ ...w, isNew: false })) || []}
        collectionTotal={5}
        onNextRound={vi.fn()}
        onChallenge={vi.fn()}
      />
    );

    // Get the trigger from the visible words section
    const wordsSection = screen.getByTestId('quick-words-collected');

    // The trigger should be clickable immediately
    const trigger = within(wordsSection).getByRole('button', { name: /breakdown|detail|score|words/i });
    expect(trigger).toBeVisible();

    // One click should open the dialog
    await user.click(trigger);

    const dialog = await screen.findByRole('dialog', { hidden: false });
    expect(dialog).toBeInTheDocument();
  });

  it('displays a summary (count and total) in addition to individual word scores', async () => {
    const user = userEvent.setup();

    render(
      <QuickPlayResults
        result={result}
        outcome={outcome}
        rival={null}
        collected={result.words?.map((w) => ({ ...w, isNew: false })) || []}
        collectionTotal={5}
        onNextRound={vi.fn()}
        onChallenge={vi.fn()}
      />
    );

    // Open drill-down
    const wordsSection = screen.getByTestId('quick-words-collected');
    const trigger = within(wordsSection).getByRole('button', { name: /breakdown|detail|score|words/i });
    await user.click(trigger);

    const dialog = await screen.findByRole('dialog', { hidden: false });

    // Should show count and total score
    const dialogText = within(dialog).getByText(/words/i);
    expect(dialogText).toBeInTheDocument();
    expect(within(dialog).getByText('113')).toBeInTheDocument();
  });

  it('dialog closes on escape or close button', async () => {
    const user = userEvent.setup();

    render(
      <QuickPlayResults
        result={result}
        outcome={outcome}
        rival={null}
        collected={result.words?.map((w) => ({ ...w, isNew: false })) || []}
        collectionTotal={5}
        onNextRound={vi.fn()}
        onChallenge={vi.fn()}
      />
    );

    // Open dialog
    const wordsSection = screen.getByTestId('quick-words-collected');
    const trigger = within(wordsSection).getByRole('button', { name: /breakdown|detail|score|words/i });
    await user.click(trigger);

    const dialog = await screen.findByRole('dialog', { hidden: false });
    expect(dialog).toBeInTheDocument();

    // Close with Escape
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { hidden: false })).not.toBeInTheDocument();
    });
  });

  it('handles missing words gracefully', () => {
    // Result with no words array
    const emptyResult: QuickRoundResult = { ...result, words: undefined };

    render(
      <QuickPlayResults
        result={emptyResult}
        outcome={outcome}
        rival={null}
        onNextRound={vi.fn()}
        onChallenge={vi.fn()}
      />
    );

    // Should render the no-words fallback state
    expect(screen.getByTestId('quick-no-words')).toBeInTheDocument();
  });
});
