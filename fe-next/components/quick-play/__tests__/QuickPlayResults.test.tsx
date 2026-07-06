import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QuickPlayResults } from '../QuickPlayResults';
import type { QuickRoundResult, QuickSubmitOutcome } from '../types';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));
vi.mock('@/utils/haptics/HapticsManager', () => ({ haptics: { success: vi.fn() } }));
vi.mock('@/components/daily/RivalCompareCard', () => ({
  default: () => <div data-testid="mock-rival-card" />,
}));

const result: QuickRoundResult = {
  mode: 'blast', seed: 's-1', score: 340, perfectScore: 500,
  scorePct: 68, wordsFound: 7, totalWords: 12, durationMs: 60000,
};
const outcome: QuickSubmitOutcome = {
  scorePct: 68, coins: 93, xp: 74, percentileToday: 73, history: [68], totalPoints: 900,
};

describe('QuickPlayResults', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: async () => ({ entries: [] }) })));
  });

  it('moves focus to its own heading on mount (screen swap has no navigation to anchor on)', async () => {
    render(
      <QuickPlayResults result={result} outcome={outcome} rival={null} onNextRound={vi.fn()} onChallenge={vi.fn()} />
    );
    await waitFor(() => expect(document.activeElement).toBe(screen.getByText('quickPlay.solo.roundComplete')));
  });

  it('colors the gauge and mode pill per the mode that was played, not a fixed color', () => {
    render(
      <QuickPlayResults result={result} outcome={outcome} rival={null} onNextRound={vi.fn()} onChallenge={vi.fn()} />
    );
    // Blast is pink in NODE_COLORS; the mode pill should carry that family, not a fixed lime.
    const pill = screen.getByText('quickPlay.solo.mode.blast');
    expect(pill.className).toContain('bg-neo-pink');
  });
});
