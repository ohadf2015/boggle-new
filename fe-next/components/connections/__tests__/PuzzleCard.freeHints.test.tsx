/**
 * PuzzleCard — every player gets 2 free hint reveals per day before the
 * rewarded-ad gate kicks in.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PuzzleCard from '../PuzzleCard';
import { FREE_HINTS_KEY } from '@/lib/connections/freeHints';
import type { ConnectionPuzzle, GameState } from '@/lib/connections/types';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

vi.mock('@/hooks/useRewardedFeatureUnlock', () => ({
  useRewardedFeatureUnlock: () => ({ canShowAd: true, status: 'idle', offer: vi.fn() }),
}));

const puzzle: ConnectionPuzzle = {
  id: 'p1',
  word1: 'BOOK',
  word2: 'HOLE',
  bridge: 'WORM',
  difficulty: 'easy',
  hint: 'It crawls through pages',
};

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    puzzles: [puzzle],
    currentIndex: 0,
    score: 0,
    streak: 0,
    lives: 3,
    wrongAttempts: 0,
    status: 'playing',
    input: '',
    completedIds: new Set(),
    ratedIds: new Set(),
    hintRevealed: false,
    ...overrides,
  };
}

function renderCard(onRevealHint = vi.fn()) {
  render(
    <PuzzleCard
      puzzle={puzzle}
      state={makeState()}
      isAdmin={false}
      onInputChange={vi.fn()}
      onSubmit={vi.fn()}
      onGiveUp={vi.fn()}
      onRevealHint={onRevealHint}
      onRate={vi.fn()}
      onNext={vi.fn()}
    />,
  );
  return onRevealHint;
}

describe('PuzzleCard — free daily hints', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows the free-hint button (not the ad gate) while free hints remain', () => {
    renderCard();
    expect(screen.getByText('connections.freeHint')).toBeInTheDocument();
    expect(screen.queryByText('connections.revealHintAd')).not.toBeInTheDocument();
  });

  it('clicking the free hint reveals immediately and consumes one', () => {
    const onRevealHint = renderCard();
    fireEvent.click(screen.getByText('connections.freeHint'));
    expect(onRevealHint).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(FREE_HINTS_KEY)).toMatch(/:1$/);
  });

  it('falls back to the ad-gated button once free hints are exhausted', () => {
    const today = new Date().toISOString().slice(0, 10);
    window.localStorage.setItem(FREE_HINTS_KEY, `${today}:2`);
    renderCard();
    expect(screen.queryByText('connections.freeHint')).not.toBeInTheDocument();
    expect(screen.getByText('connections.revealHintAd')).toBeInTheDocument();
  });
});
