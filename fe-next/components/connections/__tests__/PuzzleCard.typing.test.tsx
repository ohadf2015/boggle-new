/**
 * PuzzleCard — slot-based typing: Wordle-style answer cells, physical-keyboard
 * support on desktop, input capped at the bridge length, wrong-guess auto-clear.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import PuzzleCard from '../PuzzleCard';
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

function renderCard(state: GameState, handlers: Partial<Record<'onInputChange' | 'onSubmit', ReturnType<typeof vi.fn>>> = {}) {
  const onInputChange = handlers.onInputChange ?? vi.fn();
  const onSubmit = handlers.onSubmit ?? vi.fn();
  render(
    <PuzzleCard
      puzzle={puzzle}
      state={state}
      isAdmin={false}
      onInputChange={onInputChange}
      onSubmit={onSubmit}
      onGiveUp={vi.fn()}
      onRevealHint={vi.fn()}
      onRate={vi.fn()}
      onNext={vi.fn()}
    />,
  );
  return { onInputChange, onSubmit };
}

describe('PuzzleCard — slot typing', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders one answer slot per bridge letter', () => {
    renderCard(makeState());
    expect(screen.getAllByTestId('answer-slot')).toHaveLength(4);
  });

  it('appends a letter typed on the physical keyboard', () => {
    const { onInputChange } = renderCard(makeState());
    fireEvent.keyDown(window, { key: 'w' });
    expect(onInputChange).toHaveBeenCalledWith('W');
  });

  it('ignores physical keys with modifiers (shortcuts stay shortcuts)', () => {
    const { onInputChange } = renderCard(makeState());
    fireEvent.keyDown(window, { key: 'w', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'r', metaKey: true });
    expect(onInputChange).not.toHaveBeenCalled();
  });

  it('handles physical Backspace and Enter', () => {
    const { onInputChange, onSubmit } = renderCard(makeState({ input: 'WO' }));
    fireEvent.keyDown(window, { key: 'Backspace' });
    expect(onInputChange).toHaveBeenCalledWith('W');
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('caps typing at the slot count', () => {
    const { onInputChange } = renderCard(makeState({ input: 'WORM' }));
    fireEvent.keyDown(window, { key: 's' });
    expect(onInputChange).not.toHaveBeenCalled();
  });

  it('stops listening once the puzzle is resolved', () => {
    const { onInputChange, onSubmit } = renderCard(makeState({ status: 'correct', input: 'WORM' }));
    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onInputChange).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  describe('wrong-guess auto-clear', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('clears the buffer shortly after a wrong guess', () => {
      const { onInputChange } = renderCard(makeState({ status: 'wrong', input: 'WASP', wrongAttempts: 1 }));
      expect(onInputChange).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(700);
      });
      expect(onInputChange).toHaveBeenCalledWith('');
    });
  });
});

describe('PuzzleCard — bridge connect moment', () => {
  it('draws the connector when the bridge is solved', () => {
    renderCard(makeState({ status: 'correct', input: 'WORM' }));
    expect(screen.getByTestId('bridge-connector')).toBeInTheDocument();
  });

  it('does not draw the connector mid-play', () => {
    renderCard(makeState());
    expect(screen.queryByTestId('bridge-connector')).not.toBeInTheDocument();
  });
});
