/**
 * PuzzleCard — rating CTA visibility on resolved states.
 *
 * User feedback ("give them time to give that feedback"): the rating
 * (like/dislike) buttons must stay on screen long enough after a *correct*
 * answer for the player to actually interact with them. Auto-advance after
 * 1.2s was burying the prompt before fingers could move. Fix: surface a Next
 * button in the `correct` state too (parity with `gaveUp`) so advance is
 * user-driven, not timer-driven.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PuzzleCard from '../PuzzleCard';
import type { ConnectionPuzzle, GameState } from '@/lib/connections/types';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

vi.mock('@/hooks/useRewardedFeatureUnlock', () => ({
  useRewardedFeatureUnlock: () => ({ canShowAd: false, status: 'idle', offer: vi.fn() }),
}));

const puzzle: ConnectionPuzzle = {
  id: 'p1',
  word1: 'BOOK',
  word2: 'HOLE',
  bridge: 'WORM',
  difficulty: 'easy',
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

describe('PuzzleCard — rating + advance UX on resolved states', () => {
  it('shows like + dislike buttons when status is correct', () => {
    render(
      <PuzzleCard
        puzzle={puzzle}
        state={makeState({ status: 'correct' })}
        isAdmin={false}
        onInputChange={vi.fn()}
        onSubmit={vi.fn()}
        onGiveUp={vi.fn()}
        onRevealHint={vi.fn()}
        onRate={vi.fn()}
        onNext={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'connections.like' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'connections.dislike' })).toBeInTheDocument();
  });

  it('shows a Next button when status is correct so advance is user-driven', () => {
    render(
      <PuzzleCard
        puzzle={puzzle}
        state={makeState({ status: 'correct' })}
        isAdmin={false}
        onInputChange={vi.fn()}
        onSubmit={vi.fn()}
        onGiveUp={vi.fn()}
        onRevealHint={vi.fn()}
        onRate={vi.fn()}
        onNext={vi.fn()}
      />,
    );
    expect(screen.getByText('connections.next')).toBeInTheDocument();
  });

  it('still shows Next button when status is gaveUp (regression guard)', () => {
    render(
      <PuzzleCard
        puzzle={puzzle}
        state={makeState({ status: 'gaveUp' })}
        isAdmin={false}
        onInputChange={vi.fn()}
        onSubmit={vi.fn()}
        onGiveUp={vi.fn()}
        onRevealHint={vi.fn()}
        onRate={vi.fn()}
        onNext={vi.fn()}
      />,
    );
    expect(screen.getByText('connections.next')).toBeInTheDocument();
  });
});
