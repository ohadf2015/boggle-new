import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import GridComponent from '../GridComponent';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { stubBoardLayout, drag, press, release, selectedKeys, tileEl } from '../board/__tests__/boardTestUtils';

vi.mock('@/contexts/AccessibilityContext', () => ({
  useDisableEarthquakeEffects: () => false,
  useLargeLetters: () => false,
}));

const playTileSelectSound = vi.fn();
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playTileSelectSound,
    playEarthquakeRumble: vi.fn(),
    playEarthquakeShake: vi.fn(),
  }),
}));

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => <LanguageProvider>{children}</LanguageProvider>;

const GRID = [
  ['C', 'A', 'T'],
  ['D', 'O', 'G'],
  ['S', 'U', 'N'],
];

let restore: () => void;
beforeEach(() => {
  restore = stubBoardLayout();
  playTileSelectSound.mockClear();
});
afterEach(() => {
  restore();
  vi.useRealTimers();
});

describe('GridComponent rendering', () => {
  it('renders every letter once as a tile the capture rig and coaches can find', () => {
    const { container } = render(<GridComponent grid={GRID} />, { wrapper: Wrapper });
    const cells = container.querySelectorAll('[role="grid"] [data-row][data-col]');
    expect(cells).toHaveLength(9);
    expect([...cells].map((c) => (c as HTMLElement).dataset.letter).join('')).toBe('CATDOGSUN');
    GRID.flat().forEach((l) => expect(screen.getAllByText(l).length).toBeGreaterThan(0));
  });

  it('renders a 5x5 grid with matching template', () => {
    const grid = Array.from({ length: 5 }, () => ['A', 'B', 'C', 'D', 'E']);
    const { container } = render(<GridComponent grid={grid} />, { wrapper: Wrapper });
    expect(container.querySelectorAll('[data-tile]')).toHaveLength(25);
  });

  it('handles an empty grid', () => {
    const { container } = render(<GridComponent grid={[]} />, { wrapper: Wrapper });
    expect(container.querySelector('[role="grid"]')).toBeInTheDocument();
  });

  it('given ghost cells, then tiles stay for input but the board draws no letters', () => {
    const { container } = render(<GridComponent grid={GRID} ghostCells />, { wrapper: Wrapper });
    expect(container.querySelectorAll('[data-tile]')).toHaveLength(9);
    expect(container.querySelector('[data-board]')?.hasAttribute('data-ghost')).toBe(true);
    expect(container.querySelector('[data-gk="0-0"]')?.textContent).toBe('');
  });

  it('given a lockedHint, when a locked board is tapped, then the caller reason replaces the pregame one', () => {
    const { container } = render(
      <GridComponent grid={GRID} interactive={false} lockedHint="Tiles still falling" />,
      { wrapper: Wrapper },
    );
    fireEvent.pointerDown(container.querySelector('[role="grid"]') as HTMLElement, { button: 0, pointerId: 1, pointerType: 'touch' });
    expect(container.querySelector('[data-testid="board-locked-banner"]')?.textContent).toBe('Tiles still falling');
  });

  it('given a tileSkinOverride, then the board carries that skin regardless of the equipped one', () => {
    localStorage.setItem('lexiclash_cosmetics_equipped', JSON.stringify({ tileSkin: 'tile-neon' }));
    const { container } = render(<GridComponent grid={GRID} tileSkinOverride="tile-world-3" />, { wrapper: Wrapper });
    expect(container.querySelector('[data-tile-skin="world-3"]')).not.toBeNull();
    expect(container.querySelector('[data-tile-skin="neon"]')).toBeNull();
    localStorage.removeItem('lexiclash_cosmetics_equipped');
  });

  it('given golden letters and event tiles, then those tiles are marked', () => {
    const { container } = render(
      <GridComponent grid={GRID} goldenLetters={[{ row: 0, col: 0 }]} frozenTiles={new Set(['1-1'])} />,
      { wrapper: Wrapper },
    );
    expect(tileEl(container, 0, 0).hasAttribute('data-golden')).toBe(true);
    expect(tileEl(container, 1, 1).hasAttribute('data-frozen')).toBe(true);
  });
});

describe('GridComponent play', () => {
  it('given a drag, then the mode hears every letter as it is added (live preview)', () => {
    const onWordChange = vi.fn();
    const { container } = render(<GridComponent grid={GRID} interactive onWordChange={onWordChange} />, { wrapper: Wrapper });
    drag(container, [[1, 0], [1, 1], [1, 2]], 'touch');
    expect(onWordChange.mock.calls.map((c) => c[0])).toEqual(['D', 'DO', 'DOG']);
    expect(onWordChange).toHaveBeenLastCalledWith('DOG', 3);
  });

  it('given a released drag, then the path is submitted before the word, as a drag', () => {
    const order: string[] = [];
    const onPathSubmit = vi.fn(() => order.push('path'));
    const onWordSubmit = vi.fn(() => order.push('word'));
    const { container } = render(
      <GridComponent grid={GRID} interactive onPathSubmit={onPathSubmit} onWordSubmit={onWordSubmit} />,
      { wrapper: Wrapper },
    );
    drag(container, [[0, 0], [0, 1], [0, 2]], 'touch');
    release(container, 'touch');
    expect(order).toEqual(['path', 'word']);
    expect(onWordSubmit).toHaveBeenCalledWith('CAT', { inputMethod: 'drag' });
    expect(onPathSubmit.mock.calls[0][0]).toEqual([
      { row: 0, col: 0, letter: 'C' },
      { row: 0, col: 1, letter: 'A' },
      { row: 0, col: 2, letter: 'T' },
    ]);
  });

  it('given a T-shaped drag (down, down, right), then every tile is kept', () => {
    const { container } = render(<GridComponent grid={GRID} interactive />, { wrapper: Wrapper });
    drag(container, [[0, 0], [1, 0], [2, 0], [2, 1]], 'touch');
    expect(selectedKeys(container)).toEqual(['0-0', '1-0', '2-0', '2-1']);
  });

  it('given a cellFilter, then it is asked with the current path length', () => {
    const cellFilter = vi.fn((r: number, c: number) => !(r === 0 && c === 1));
    const { container } = render(<GridComponent grid={GRID} interactive cellFilter={cellFilter} />, { wrapper: Wrapper });
    drag(container, [[0, 0], [0, 1]], 'touch');
    expect(selectedKeys(container)).toEqual(['0-0']);
    expect(cellFilter).toHaveBeenCalledWith(0, 1, 1);
  });

  it('given each new letter, then the tile-select sound plays', () => {
    const { container } = render(<GridComponent grid={GRID} interactive />, { wrapper: Wrapper });
    drag(container, [[0, 0], [0, 1]], 'touch');
    expect(playTileSelectSound).toHaveBeenCalledTimes(2);
  });

  it('given a touch tap, then the single-tap callback fires', () => {
    const onSingleTapDetected = vi.fn();
    const { container } = render(<GridComponent grid={GRID} interactive onSingleTapDetected={onSingleTapDetected} />, { wrapper: Wrapper });
    press(container, 1, 1, 'touch');
    release(container, 'touch');
    expect(onSingleTapDetected).toHaveBeenCalledWith({ row: 1, col: 1, letter: 'O' });
  });
});

describe('GridComponent desktop idle auto-submit', () => {
  const clickTiles = (container: HTMLElement, cells: Array<[number, number]>) => {
    for (const [r, c] of cells) {
      press(container, r, c);
      release(container);
    }
  };

  it('given 3 click-selected letters and no autoSubmitIdleMs, then it submits after the default 1s', () => {
    vi.useFakeTimers();
    const onWordSubmit = vi.fn();
    const { container } = render(<GridComponent grid={GRID} interactive onWordSubmit={onWordSubmit} />, { wrapper: Wrapper });
    clickTiles(container, [[0, 0], [0, 1], [0, 2]]);
    act(() => { vi.advanceTimersByTime(990); });
    expect(onWordSubmit).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(20); });
    expect(onWordSubmit).toHaveBeenCalledWith('CAT', { inputMethod: 'drag' });
  });

  it('given only 2 letters, then it never idle-submits', () => {
    vi.useFakeTimers();
    const onWordSubmit = vi.fn();
    const { container } = render(<GridComponent grid={GRID} interactive onWordSubmit={onWordSubmit} />, { wrapper: Wrapper });
    clickTiles(container, [[0, 0], [0, 1]]);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(onWordSubmit).not.toHaveBeenCalled();
  });

  it('given a new letter, then the idle window restarts from it', () => {
    vi.useFakeTimers();
    const onWordSubmit = vi.fn();
    const { container } = render(<GridComponent grid={GRID} interactive onWordSubmit={onWordSubmit} />, { wrapper: Wrapper });
    clickTiles(container, [[0, 0], [0, 1], [0, 2]]);
    act(() => { vi.advanceTimersByTime(800); });
    clickTiles(container, [[1, 2]]);
    act(() => { vi.advanceTimersByTime(800); });
    expect(onWordSubmit).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(250); });
    expect(onWordSubmit).toHaveBeenCalledWith('CATG', { inputMethod: 'drag' });
  });
});

describe('GridComponent verdicts', () => {
  it('given accepted feedback for the word just played, then its tiles celebrate', () => {
    const { container, rerender } = render(<GridComponent grid={GRID} interactive />, { wrapper: Wrapper });
    drag(container, [[0, 0], [0, 1], [0, 2]], 'touch');
    release(container, 'touch');
    rerender(
      <GridComponent grid={GRID} interactive submitFeedback={{ id: 'f1', type: 'accepted', word: 'CAT', score: 3, timestamp: 1 }} />,
    );
    expect(tileEl(container, 0, 1).getAttribute('data-fx')).toBe('ok');
  });

  it('given rejected feedback, then its tiles shake', () => {
    const { container, rerender } = render(<GridComponent grid={GRID} interactive />, { wrapper: Wrapper });
    drag(container, [[2, 0], [2, 1], [2, 2]], 'touch');
    release(container, 'touch');
    rerender(<GridComponent grid={GRID} interactive submitFeedback={{ id: 'f2', type: 'rejected', word: 'SUN', timestamp: 1 }} />);
    expect(tileEl(container, 2, 2).getAttribute('data-fx')).toBe('bad');
  });

  it('given feedback for a word the board never played, then no tile reacts', () => {
    const { container, rerender } = render(<GridComponent grid={GRID} interactive />, { wrapper: Wrapper });
    drag(container, [[0, 0], [0, 1], [0, 2]], 'touch');
    release(container, 'touch');
    rerender(<GridComponent grid={GRID} interactive submitFeedback={{ id: 'f3', type: 'accepted', word: 'DOG', timestamp: 1 }} />);
    expect(container.querySelector('[data-tile][data-fx="ok"]')).toBeNull();
  });
});

describe('GridComponent hints', () => {
  it('given a highlighted path, then those tiles blink, then fade', () => {
    vi.useFakeTimers();
    const { container } = render(
      <GridComponent grid={GRID} highlightedPath={[{ row: 0, col: 0 }, { row: 1, col: 1 }]} />,
      { wrapper: Wrapper },
    );
    const board = container.querySelector('[data-board]')!;
    expect(tileEl(container, 0, 0).hasAttribute('data-hint')).toBe(true);
    expect(tileEl(container, 2, 2).hasAttribute('data-hint')).toBe(false);
    expect(board.getAttribute('data-hint-phase')).toBe('blink');
    act(() => { vi.advanceTimersByTime(1600); });
    expect(board.getAttribute('data-hint-phase')).toBe('fadeout');
  });
});

describe('GridComponent tile skins', () => {
  it('given an equipped tile skin, then every tile carries the skin hook the cosmetics paint', () => {
    const { container } = render(<GridComponent grid={GRID} tileSkinOverride="tile-neon" />, { wrapper: Wrapper });
    expect(container.querySelector('[data-tile-skin="neon"]')).not.toBeNull();
    const tiles = [...container.querySelectorAll('[data-tile]')];
    expect(tiles.every((el) => el.classList.contains('letter-tile-gradient'))).toBe(true);
  });
});
