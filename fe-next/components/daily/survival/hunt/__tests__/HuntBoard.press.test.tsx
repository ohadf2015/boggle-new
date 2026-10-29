import React, { Profiler } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';
import { HuntBoard } from '../HuntBoard';
import type { LetterGrid } from '@/types';
import { drag, press, release, selectedKeys, stubBoardLayout, tileEl } from '@/components/board/__tests__/boardTestUtils';

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => new Proxy({}, { get: () => vi.fn() }),
}));

const grid = [['C', 'A', 'T'], ['S', 'E', 'R'], ['D', 'O', 'G']] as unknown as LetterGrid;

function board(interactive = true, onCommit?: () => void, onLive = vi.fn()) {
  return render(
    <Profiler id="hunt" onRender={() => onCommit?.()}>
      <HuntBoard
        grid={grid} interactive={interactive} eliminatedLetters={new Set()}
        onWordSubmit={() => {}} onRelease={() => {}} onLive={onLive}
        phase="idle" verdict={null} heldPath={[]} calm={false} t={(k: string) => k}
      />
    </Profiler>,
  );
}

describe('HuntBoard press feedback', () => {
  let restoreLayout: () => void;
  beforeEach(() => { restoreLayout = stubBoardLayout(); });
  afterEach(() => { restoreLayout(); vi.restoreAllMocks(); });

  it('Given a tile, When it is pressed, Then it lights up inside the same event, before React renders', () => {
    const { container } = board();
    press(container, 1, 0, 'touch');
    expect(tileEl(container, 1, 0).hasAttribute('data-sel')).toBe(true);
    expect(tileEl(container, 0, 0).hasAttribute('data-sel')).toBe(false);
  });

  it('Given a pressed tile, When the touch lifts without a drag, Then the light clears', () => {
    const { container } = board();
    act(() => { press(container, 1, 0, 'touch'); release(container, 'touch'); });
    expect(tileEl(container, 1, 0).hasAttribute('data-sel')).toBe(false);
  });

  it('Given the game is over, When a tile is pressed, Then nothing lights up', () => {
    const { container } = board(false);
    press(container, 1, 0, 'touch');
    expect(tileEl(container, 1, 0).hasAttribute('data-sel')).toBe(false);
  });

  it('Given a finger drag across the board, When each letter joins, Then the path and its head are painted with no React render per letter', () => {
    let commits = 0;
    const onLive = vi.fn();
    const { container } = board(true, () => { commits += 1; }, onLive);
    commits = 0;
    act(() => { drag(container, [[0, 0], [0, 1], [0, 2], [1, 2], [1, 1]], 'touch'); });
    expect(selectedKeys(container)).toEqual(['0-0', '0-1', '0-2', '1-2', '1-1']);
    expect(tileEl(container, 1, 1).hasAttribute('data-head')).toBe(true);
    expect(onLive).toHaveBeenLastCalledWith('CATRE');
    expect(commits).toBeLessThanOrEqual(1);
  });
});
