import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';
import { HuntBoard } from '../HuntBoard';
import type { LetterGrid } from '@/types';
import { press, release, stubBoardLayout } from '@/components/board/__tests__/boardTestUtils';

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => new Proxy({}, { get: () => vi.fn() }),
}));

const grid = [['C', 'A', 'T'], ['S', 'E', 'R'], ['D', 'O', 'G']] as unknown as LetterGrid;

function props(eliminatedLetters: Set<string>) {
  return {
    grid, interactive: true, eliminatedLetters,
    onWordSubmit: () => {}, onRelease: () => {}, onLive: () => {},
    phase: 'idle' as const, verdict: null, heldPath: [], calm: false, t: (k: string) => k,
  };
}

describe('HuntBoard tile memo', () => {
  let restoreLayout: () => void;
  beforeEach(() => { restoreLayout = stubBoardLayout(); });
  afterEach(() => { restoreLayout(); vi.restoreAllMocks(); });

  it('Given a mounted board, When a press starts and ends, Then the tile and glyph grids are not rebuilt', () => {
    const eliminated = new Set<string>();
    const { container } = render(<HuntBoard {...props(eliminated)} />);
    const has = vi.spyOn(eliminated, 'has');
    act(() => { press(container, 1, 0, 'touch'); });
    act(() => { release(container, 'touch'); });
    expect(has).not.toHaveBeenCalled();
  });

  it('Given a parent that passes an equal new Set each render, When it re-renders, Then the grids are not rebuilt', () => {
    const { rerender } = render(<HuntBoard {...props(new Set(['Q']))} />);
    const next = new Set(['Q']);
    const has = vi.spyOn(next, 'has');
    rerender(<HuntBoard {...props(next)} />);
    expect(has).not.toHaveBeenCalled();
  });

  it('Given a letter is eliminated, When the board re-renders, Then its tile and glyph show it', () => {
    const { container, rerender } = render(<HuntBoard {...props(new Set())} />);
    rerender(<HuntBoard {...props(new Set(['C']))} />);
    expect(container.querySelector('[data-tile][data-row="0"][data-col="0"]')?.getAttribute('data-eliminated')).toBe('true');
    expect(container.querySelector('[data-gk="0-0"]')?.getAttribute('data-eliminated')).toBe('true');
  });
});
