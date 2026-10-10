import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as gridInteraction from '@/components/grid/useGridInteraction';
import { HuntBoard, HUNT_IDLE_SUBMIT_MS } from '../HuntBoard';
import type { LetterGrid } from '@/types';

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
    const spy = vi.spyOn(gridInteraction, 'useGridInteraction');
    board();
    expect(HUNT_IDLE_SUBMIT_MS).toBeGreaterThan(1000);
    expect(spy.mock.calls.at(-1)?.[0]).toMatchObject({ autoSubmitIdleMs: HUNT_IDLE_SUBMIT_MS });
    spy.mockRestore();
  });
});
