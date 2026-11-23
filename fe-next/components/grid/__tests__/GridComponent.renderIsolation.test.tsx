import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import GridComponent from '@/components/GridComponent';
import type { LetterGrid } from '@/types';

const boardRenders = vi.hoisted(() => ({ count: 0 }));

vi.mock('@/components/board/useBoardSelection', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/components/board/useBoardSelection')>();
  return {
    ...real,
    useBoardSelection: (...args: Parameters<typeof real.useBoardSelection>) => {
      boardRenders.count++;
      return real.useBoardSelection(...args);
    },
  };
});

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, fallback?: string) => fallback ?? key, language: 'en', dir: 'ltr' }),
  useLanguageSafe: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/contexts/AccessibilityContext', () => ({
  useSuppressTimerUrgency: () => false,
  useDisableFireRoundLights: () => false,
  useDisableEarthquakeEffects: () => false,
  useLargeLetters: () => false,
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playEarthquakeRumble: vi.fn(), playEarthquakeShake: vi.fn(), playTileSelectSound: vi.fn() }),
}));

const grid: LetterGrid = [
  ['C', 'A', 'T', 'S'],
  ['W', 'O', 'R', 'D'],
  ['H', 'U', 'N', 'T'],
  ['G', 'A', 'M', 'E'],
];

function tile(container: HTMLElement, row: number, col: number) {
  return container.querySelector<HTMLElement>(`[data-tile][data-row="${row}"][data-col="${col}"]`)!;
}

describe('GridComponent render isolation', () => {
  beforeEach(() => {
    boardRenders.count = 0;
  });

  it('given a parent re-render with fresh callbacks, when nothing board-shaped changed, then the board does not re-render', () => {
    const { rerender } = render(
      <GridComponent grid={grid} interactive onWordSubmit={() => {}} onSingleTapDetected={() => {}} onWordChange={() => {}} />,
    );
    const afterMount = boardRenders.count;

    for (let i = 0; i < 5; i++) {
      rerender(<GridComponent grid={grid} interactive onWordSubmit={() => {}} onSingleTapDetected={() => {}} onWordChange={() => {}} />);
    }

    expect(boardRenders.count).toBe(afterMount);
  });

  it('given callbacks swapped after mount, when a word is clicked out, then the latest callbacks receive it', () => {
    const stale = vi.fn();
    const latest = vi.fn();
    const latestChange = vi.fn();
    const { container, rerender } = render(<GridComponent grid={grid} interactive onWordSubmit={stale} onWordChange={stale} />);
    rerender(<GridComponent grid={grid} interactive onWordSubmit={latest} onWordChange={latestChange} />);

    for (const [r, c] of [[0, 0], [0, 1], [0, 2]] as const) {
      fireEvent.pointerDown(tile(container, r, c), { pointerId: 1, pointerType: 'mouse', button: 0 });
      fireEvent.pointerUp(tile(container, r, c), { pointerId: 1, pointerType: 'mouse', button: 0 });
    }
    fireEvent.pointerDown(tile(container, 0, 2), { pointerId: 1, pointerType: 'mouse', button: 0 });

    expect(latestChange).toHaveBeenCalledWith('CAT', 3);
    expect(latest).toHaveBeenCalledWith('CAT', { inputMethod: 'drag' });
    expect(stale).not.toHaveBeenCalled();
  });
});
