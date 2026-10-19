import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import * as boardSelection from '@/components/board/useBoardSelection';
import { HuntBoard, HUNT_IDLE_SUBMIT_MS } from '../HuntBoard';
import type { LetterGrid } from '@/types';
import { press, release, stubBoardLayout, drag } from '@/components/board/__tests__/boardTestUtils';

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => new Proxy({}, { get: () => vi.fn() }),
}));

const grid = [
  ['S', 'F', 'R', 'K'],
  ['F', 'E', 'V', 'S'],
  ['E', 'X', 'E', 'M'],
  ['H', 'R', 'N', 'E'],
] as unknown as LetterGrid;

function board(props: Partial<React.ComponentProps<typeof HuntBoard>> = {}) {
  return render(
    <HuntBoard
      grid={grid}
      interactive
      eliminatedLetters={new Set()}
      onWordSubmit={() => {}}
      onWordChange={() => {}}
      onRelease={() => {}}
      onLive={() => {}}
      phase="idle"
      verdict={null}
      heldPath={[]}
      calm={false}
      t={(k: string) => k}
      {...props}
    />,
  );
}

describe('HuntBoard', () => {
  it('renders every tile as a grid cell with row, column and letter data', () => {
    board();
    expect(screen.getByRole('grid', { name: 'wordHunt.survival.stage.boardLabel' })).toBeTruthy();
    const cells = screen.getAllByRole('gridcell');
    expect(cells).toHaveLength(16);
    expect(cells[5].dataset).toMatchObject({ row: '1', col: '1', letter: 'E' });
  });

  it('keeps the released path lit with the verdict colour', () => {
    board({ phase: 'verdict', verdict: 'good', heldPath: [{ row: 0, col: 0 }, { row: 1, col: 1 }] });
    expect(screen.getByRole('grid').dataset.verdict).toBe('good');
    const lit = screen.getAllByRole('gridcell').filter((c) => c.dataset.state === 'held');
    expect(lit.map((c) => c.dataset.letter)).toEqual(['S', 'E']);
    expect(screen.getByTestId('hunt-trail')).toBeTruthy();
  });

  it('draws no trail when nothing is selected', () => {
    board();
    expect(screen.queryByTestId('hunt-trail')).toBeNull();
  });

  it('dims letters ruled out of the hidden word', () => {
    board({ eliminatedLetters: new Set(['X']) });
    const x = screen.getAllByRole('gridcell').find((c) => c.dataset.letter === 'X');
    expect(x?.dataset.eliminated).toBe('true');
  });

  it('gives a held mouse drag longer than the shared one second before it submits on its own', () => {
    const spy = vi.spyOn(boardSelection, 'useBoardSelection');
    board();
    expect(HUNT_IDLE_SUBMIT_MS).toBeGreaterThan(1000);
    expect(spy.mock.calls.at(-1)?.[1]).toMatchObject({ autoSubmitIdleMs: HUNT_IDLE_SUBMIT_MS });
    spy.mockRestore();
  });

  describe('on a mouse with hover', () => {
    let restoreLayout: () => void;
    const realMatchMedia = window.matchMedia;
    beforeEach(() => {
      restoreLayout = stubBoardLayout();
      window.matchMedia = ((query: string) => ({
        matches: query.includes('hover: hover'),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      })) as unknown as typeof window.matchMedia;
    });
    afterEach(() => {
      restoreLayout();
      window.matchMedia = realMatchMedia;
    });

    it('given two tiles clicked one after another, then the double-click submit hint shows', () => {
      const { container } = board();
      act(() => { press(container, 0, 0); release(container); });
      act(() => { press(container, 0, 1); release(container); });
      expect(screen.getByTestId('grid-doubleclick-submit-hint')).toBeTruthy();
    });

    it('given one stray click, when the idle window passes, then the lone selection clears itself', () => {
      vi.useFakeTimers();
      try {
        const { container } = board();
        act(() => { press(container, 0, 0); release(container); });
        expect(screen.getAllByRole('gridcell').filter((c) => c.dataset.state === 'sel')).toHaveLength(1);
        act(() => { vi.advanceTimersByTime(HUNT_IDLE_SUBMIT_MS + 50); });
        expect(screen.getAllByRole('gridcell').filter((c) => c.dataset.state)).toHaveLength(0);
      } finally {
        vi.useRealTimers();
      }
    });

    it('given a verdict still held, when a new drag starts, then the new selection shows at once and the old verdict clears', () => {
      const { container } = board({ phase: 'verdict', verdict: 'bad', heldPath: [{ row: 0, col: 0 }, { row: 1, col: 1 }] });
      act(() => { press(container, 3, 3); });
      const grid = screen.getByRole('grid');
      expect(grid.dataset.verdict).toBeUndefined();
      const cells = screen.getAllByRole('gridcell');
      expect(cells.filter((c) => c.dataset.state === 'held')).toHaveLength(0);
      expect(cells[15].dataset.state).toBe('sel');
    });

    it('given a drag through two tiles, then no click hint shows', () => {
      const { container } = board();
      act(() => { drag(container, [[0, 0], [0, 1]]); });
      expect(screen.queryByTestId('grid-doubleclick-submit-hint')).toBeNull();
    });
  });
});

const largeLetters = vi.hoisted(() => ({ on: false }));
vi.mock('@/contexts/AccessibilityContext', () => ({ useLargeLetters: () => largeLetters.on }));

describe('HuntBoard accessibility (restored from the pre-redesign grid)', () => {
  afterEach(() => { largeLetters.on = false; });

  it('Given a screen reader, When it reads a tile, Then it hears the row, column and letter', () => {
    const t = (key: string, params?: Record<string, string | number> | string) =>
      typeof params === 'object' ? `${key}:${params.row}/${params.col}/${params.letter}` : key;
    board({ t });
    expect(screen.getAllByRole('gridcell')[5].getAttribute('aria-label')).toBe('game.grid.cellLabel:2/2/E');
  });

  it('Given the large-letters setting, When the board renders, Then it is marked large', () => {
    largeLetters.on = true;
    const { container } = board();
    expect(container.firstElementChild?.getAttribute('data-large')).toBe('true');
  });
});
