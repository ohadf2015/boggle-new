import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import * as boardSelection from '@/components/board/useBoardSelection';
import { HuntBoard } from '../HuntBoard';
import type { LetterGrid } from '@/types';
import { press, release, tileEl } from '@/components/board/__tests__/boardTestUtils';

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => new Proxy({}, { get: () => vi.fn() }),
}));

const grid = [['C', 'A'], ['T', 'S']] as unknown as LetterGrid;

function board(interactive = true) {
  return render(
    <HuntBoard
      grid={grid} interactive={interactive} eliminatedLetters={new Set()}
      onWordSubmit={() => {}} onWordChange={() => {}} onRelease={() => {}} onLive={() => {}}
      phase="idle" verdict={null} heldPath={[]} calm={false} t={(k: string) => k}
    />,
  );
}

describe('HuntBoard press feedback', () => {
  afterEach(() => vi.restoreAllMocks());

  it('Given a selection engine that has not reported yet, When a tile is pressed, Then that tile lights up in the same event', () => {
    vi.spyOn(boardSelection, 'useBoardSelection').mockReturnValue({ current: null } as never);
    const { container } = board();
    press(container, 1, 0);
    expect(tileEl(container, 1, 0).dataset.pressed).toBe('true');
    expect(tileEl(container, 0, 0).dataset.pressed).toBeUndefined();
  });

  it('Given a pressed tile, When the pointer lifts, Then the press light clears', () => {
    vi.spyOn(boardSelection, 'useBoardSelection').mockReturnValue({ current: null } as never);
    const { container } = board();
    press(container, 1, 0);
    release(container);
    expect(tileEl(container, 1, 0).dataset.pressed).toBeUndefined();
  });

  it('Given the game is over, When a tile is pressed, Then nothing lights up', () => {
    const { container } = board(false);
    press(container, 1, 0);
    expect(tileEl(container, 1, 0).dataset.pressed).toBeUndefined();
  });
});
