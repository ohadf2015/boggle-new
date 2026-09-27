/**
 * Pyramid UI rebuild (2026-07-13): the mode read as unclear/over-complex.
 * - The pyramid shape (apex + 3 base slots) must be visible from stage 0 so
 *   the goal is obvious before the finale.
 * - The current base slot is highlighted so the player knows where they are.
 * - A one-line explainer replaces guesswork.
 * - No dead CTAs: no rating buttons in pyramid stages (their onRate was a
 *   no-op), no redundant "1 / 3" counter.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PyramidChallenge from '../PyramidChallenge';
import FinaleCard from '../FinaleCard';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, isAdmin: false }),
}));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('@/hooks/useHapticFeedback', () => ({
  useHapticFeedback: () => ({ haptic: vi.fn(), customHaptic: vi.fn() }),
  GAME_HAPTICS: { validWord: 10, invalidWord: [1], comboLevelUp: [1], achievement: [1] },
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playMatchFoundSound: vi.fn(), playErrorSound: vi.fn(), playVictorySound: vi.fn() }),
}));
vi.mock('@/utils/confettiUtils', () => ({ fireVictoryConfetti: vi.fn() }));
vi.mock('@/hooks/useRewardedFeatureUnlock', () => ({
  useRewardedFeatureUnlock: () => ({ canShowAd: false, status: 'idle', offer: vi.fn() }),
}));

const basePuzzle = (id: string, word1: string, word2: string) => ({
  id,
  word1,
  word2,
  bridge: 'STONE',
  difficulty: 'easy' as const,
});

const mockPyramid = {
  id: 'test-pyramid',
  metaAnswer: 'STONE',
  metaHint: 'Hard and rigid',
  base: [
    basePuzzle('p1', 'ROLLING', 'TABLET'),
    basePuzzle('p2', 'RIVER', 'FRUIT'),
    basePuzzle('p3', 'PRECIOUS', 'COLD'),
  ],
  difficulty: 'medium' as const,
};

vi.mock('@/lib/connections/pyramid/daily', () => ({
  dailyPyramid: () => mockPyramid,
}));

describe('Pyramid — simplified, goal-first UI', () => {
  it('shows the apex "?" from stage 0 so the pyramid goal is visible upfront', () => {
    render(<PyramidChallenge />);
    expect(screen.getByTestId('pyramid-apex')).toBeTruthy();
  });

  it('highlights the current base slot', () => {
    render(<PyramidChallenge />);
    expect(screen.getByTestId('pyramid-slot-current')).toBeTruthy();
  });

  it('shows a one-line explainer during base stages', () => {
    render(<PyramidChallenge />);
    expect(screen.getByText('connections.pyramid.explainer')).toBeTruthy();
  });

  it('renders no rating buttons in pyramid stages (dead CTA removed)', () => {
    render(<PyramidChallenge />);
    expect(screen.queryByLabelText('connections.like')).toBeNull();
    expect(screen.queryByLabelText('connections.dislike')).toBeNull();
  });
});

describe('FinaleCard — Next actually advances', () => {
  it('calls onNext when the resolved-state Next button is clicked', () => {
    const onNext = vi.fn();
    render(
      <FinaleCard
        bridges={['STONE', 'STONE', 'STONE']}
        pyramid={mockPyramid as never}
        input=""
        wrongAttempts={0}
        hintRevealed={false}
        status="gaveUp"
        onInputChange={vi.fn()}
        onSubmit={vi.fn()}
        onGiveUp={vi.fn()}
        onRevealHint={vi.fn()}
        onNext={onNext}
        isAdmin={false}
      />,
    );
    fireEvent.click(screen.getByText('connections.next'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
