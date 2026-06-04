/**
 * Memory Hunt — "first miss per round is free" forgiveness rule.
 *
 * The harshest part of the old drill: one wrong guess = one life lost, and at
 * higher levels you start with a single life, so a single misread = instant
 * game over. The rework gives every round one free warm-up miss before lives
 * start dropping — softening the sting without removing the challenge.
 *
 * @module components/drills/__tests__/useMemoryHuntGame.freeMiss.test
 */

import { renderHook, act } from '@testing-library/react';

// Any submitted word counts as "on the board" so we can exercise the
// wrong-but-valid (non-target) branch deterministically.
vi.mock('@/utils/utils', () => ({
  isWordOnBoard: () => true,
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playErrorSound: vi.fn(),
    playDrillStartSound: vi.fn(),
    playDrillCompleteSound: vi.fn(),
  }),
}));

import { useMemoryHuntGame } from '../useMemoryHuntGame';

const availableWords = [
  { word: 'CAT', path: [{ row: 0, col: 0 }] },
  { word: 'DOG', path: [{ row: 1, col: 1 }] },
  { word: 'FOX', path: [{ row: 2, col: 2 }] },
  { word: 'OWL', path: [{ row: 3, col: 3 }] },
];

function setup() {
  return renderHook(() =>
    useMemoryHuntGame({
      grid: [] as never,
      availableWords,
      level: 1, // wordCount 2, lives 3
      language: 'en',
      onComplete: vi.fn(),
    })
  );
}

/** Advance from study phase into recall. */
function enterRecall() {
  act(() => {
    vi.advanceTimersByTime(6000); // studyTime 5s + buffer
  });
}

describe('useMemoryHuntGame — free first miss per round', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('does NOT cost a life on the first wrong guess of a round', () => {
    const { result } = setup();
    act(() => result.current.startGame());
    enterRecall();

    expect(result.current.lives).toBe(3);

    // A valid-but-not-target word (ZEBRA is not in availableWords/targets).
    act(() => result.current.handleWordSubmit('ZEBRA'));
    act(() => vi.advanceTimersByTime(1000));

    // First miss is free — lives untouched.
    expect(result.current.lives).toBe(3);
  });

  it('DOES cost a life on the second wrong guess of the same round', () => {
    const { result } = setup();
    act(() => result.current.startGame());
    enterRecall();

    act(() => result.current.handleWordSubmit('ZEBRA'));
    act(() => vi.advanceTimersByTime(1000));
    act(() => result.current.handleWordSubmit('HIPPO'));
    act(() => vi.advanceTimersByTime(1000));

    // Second miss bites.
    expect(result.current.lives).toBe(2);
  });
});
