/** A stuck daily player with no ad available can move on instead of only burning tries. */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PuzzleCard from '../PuzzleCard';
import type { ConnectionPuzzle, GameState } from '@/lib/connections/types';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));
const ad = vi.hoisted(() => ({ canShowAd: false }));
vi.mock('@/hooks/useRewardedFeatureUnlock', () => ({
  useRewardedFeatureUnlock: () => ({ canShowAd: ad.canShowAd, status: 'idle', offer: vi.fn() }),
}));

const puzzle: ConnectionPuzzle = { id: 'p1', word1: 'BOOK', word2: 'HOLE', bridge: 'WORM', difficulty: 'easy' };
const state = (wrongAttempts: number): GameState => ({
  puzzles: [puzzle],
  currentIndex: 0,
  score: 0,
  streak: 0,
  lives: 3,
  wrongAttempts,
  status: wrongAttempts ? 'wrong' : 'playing',
  input: '',
  completedIds: new Set(),
  ratedIds: new Set(),
  hintRevealed: false,
});

function card(wrongAttempts: number, onGiveUp = vi.fn(), skipAfterMisses?: number) {
  render(
    <PuzzleCard
      puzzle={puzzle}
      state={state(wrongAttempts)}
      isAdmin={false}
      onInputChange={vi.fn()}
      onSubmit={vi.fn()}
      onGiveUp={onGiveUp}
      onRevealHint={vi.fn()}
      onRate={vi.fn()}
      onNext={vi.fn()}
      skipAfterMisses={skipAfterMisses}
    />,
  );
  return onGiveUp;
}

describe('PuzzleCard — stuck skip', () => {
  it('after two misses without an ad, the daily offers a free skip', () => {
    ad.canShowAd = false;
    const onGiveUp = card(2, vi.fn(), 2);
    fireEvent.click(screen.getByRole('button', { name: /connections\.daily\.skipStuck/ }));
    expect(onGiveUp).toHaveBeenCalled();
  });

  it('not before the misses, not outside the daily, not when the ad reveal is there', () => {
    ad.canShowAd = false;
    card(1, vi.fn(), 2);
    expect(screen.queryByRole('button', { name: /connections\.daily\.skipStuck/ })).toBeNull();
  });

  it('endless mode keeps its rules', () => {
    ad.canShowAd = false;
    card(3);
    expect(screen.queryByRole('button', { name: /connections\.daily\.skipStuck/ })).toBeNull();
  });

  it('the ad reveal wins when it can show', () => {
    ad.canShowAd = true;
    card(3, vi.fn(), 2);
    expect(screen.queryByRole('button', { name: /connections\.daily\.skipStuck/ })).toBeNull();
  });
});
