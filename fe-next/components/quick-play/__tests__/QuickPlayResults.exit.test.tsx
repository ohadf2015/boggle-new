import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickPlayResults } from '../QuickPlayResults';
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
vi.mock('@/hooks/useReducedMotion', () => ({ __esModule: true, default: vi.fn(() => false) }));

const result: QuickRoundResult = {
  mode: 'blast', seed: 's-1', score: 340, perfectScore: 500, scorePct: 68,
  wordsFound: 7, totalWords: 12, durationMs: 60000,
};
const outcome: QuickSubmitOutcome = {
  scorePct: 68, coins: 93, xp: 74, percentileToday: 73, history: [68], totalPoints: 900,
};

function renderResults(onExit?: () => void) {
  return render(
    <QuickPlayResults
      result={result}
      outcome={outcome}
      rival={null}
      onNextRound={vi.fn()}
      onChallenge={vi.fn()}
      onExit={onExit}
    />
  );
}

describe('QuickPlayResults exit button', () => {
  it('offers a way out of the results screen and calls it', () => {
    const onExit = vi.fn();
    renderResults(onExit);
    fireEvent.click(screen.getByTestId('quick-results-exit'));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('shows no exit button when the caller gives none', () => {
    renderResults();
    expect(screen.queryByTestId('quick-results-exit')).toBeNull();
  });
});
