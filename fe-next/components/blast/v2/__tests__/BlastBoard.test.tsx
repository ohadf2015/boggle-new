import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlastBoard } from '../BlastBoard';
import { cellId } from '@/lib/blast/v2/engine';
import type { BlastLevel } from '@/lib/blast/v2/types';

const mockLevel: BlastLevel = {
  id: 'board-test',
  levelNumber: 1,
  locale: 'en',
  theme: 'onboarding',
  columns: [
    { index: 0, tiles: ['C', 'A', 'T'] },
    { index: 1, tiles: ['S', 'U', 'N'] },
    { index: 2, tiles: ['E', 'G', 'G'] },
  ],
  words: ['CAT', 'SUN', 'EGG'],
  resolvableOrder: ['CAT', 'SUN', 'EGG'],
  tileFlags: {},
  gravityMode: 'standard',
  difficulty: 1,
};

describe('BlastBoard', () => {
  it('renders all tiles with correct data-cell-id', () => {
    const { container } = render(
      <BlastBoard
        level={mockLevel}
        selection={{ kind: 'idle' }}
        invalidShakeKey={0}
        onPointerDown={vi.fn()}
        onPointerEnter={vi.fn()}
        onPointerUp={vi.fn()}
        tileIds={mockLevel.columns.map((col, c) => col.tiles.map((_, r) => `t-${c}-${r}`))}
        boardRows={3}
      />
    );
    expect(container.querySelector('[data-cell-id="c0r0"]')).toBeInTheDocument();
    expect(container.querySelector('[data-cell-id="c1r1"]')).toBeInTheDocument();
    expect(container.querySelector('[data-cell-id="c2r2"]')).toBeInTheDocument();
  });

  describe('mobile drag (window-level pointermove + elementFromPoint)', () => {
    let originalElementFromPoint: typeof document.elementFromPoint;
    beforeEach(() => {
      originalElementFromPoint = document.elementFromPoint.bind(document);
    });
    afterEach(() => {
      document.elementFromPoint = originalElementFromPoint;
    });

    it('dispatches onPointerEnter for cell under window pointermove during active drag', () => {
      const onDown = vi.fn();
      const onEnter = vi.fn();
      const onUp = vi.fn();
      const { container } = render(
        <BlastBoard
          level={mockLevel}
          selection={{ kind: 'active', cells: ['c0r0'], axis: 'undecided', mode: 'drag' }}
          invalidShakeKey={0}
          onPointerDown={onDown}
          onPointerEnter={onEnter}
          onPointerUp={onUp}
          tileIds={mockLevel.columns.map((col, c) => col.tiles.map((_, r) => `t-${c}-${r}`))}
        />
      );
      const startTile = container.querySelector('[data-cell-id="c0r0"]') as HTMLElement;
      const targetTile = container.querySelector('[data-cell-id="c1r0"]') as HTMLElement;
      expect(startTile).toBeInTheDocument();
      expect(targetTile).toBeInTheDocument();

      // Begin selection on c0r0
      fireEvent.pointerDown(startTile, { pointerId: 1, pointerType: 'touch', clientX: 10, clientY: 10 });
      expect(onDown).toHaveBeenCalledWith('c0r0');

      // Simulate finger moving over c1r0 — elementFromPoint must resolve to that tile
      document.elementFromPoint = vi.fn(() => targetTile);
      fireEvent.pointerMove(window, { pointerId: 1, pointerType: 'touch', clientX: 50, clientY: 10 });

      expect(onEnter).toHaveBeenCalledWith('c1r0');
    });

    it('dispatches onPointerUp on window pointerup after touch drag', () => {
      const onUp = vi.fn();
      const { container } = render(
        <BlastBoard
          level={mockLevel}
          selection={{ kind: 'active', cells: ['c0r0'], axis: 'undecided', mode: 'drag' }}
          invalidShakeKey={0}
          onPointerDown={vi.fn()}
          onPointerEnter={vi.fn()}
          onPointerUp={onUp}
          tileIds={mockLevel.columns.map((col, c) => col.tiles.map((_, r) => `t-${c}-${r}`))}
        />
      );
      const tile = container.querySelector('[data-cell-id="c0r0"]') as HTMLElement;
      fireEvent.pointerDown(tile, { pointerId: 1, pointerType: 'touch' });
      fireEvent.pointerUp(window, { pointerId: 1, pointerType: 'touch' });
      expect(onUp).toHaveBeenCalled();
    });
  });

  it('HE locale sets dir=rtl on root', () => {
    const heLevel = { ...mockLevel, locale: 'he' as any };
    const { container } = render(
      <BlastBoard
        level={heLevel}
        selection={{ kind: 'idle' }}
        invalidShakeKey={0}
        onPointerDown={vi.fn()}
        onPointerEnter={vi.fn()}
        onPointerUp={vi.fn()}
        tileIds={heLevel.columns.map((col, c) => col.tiles.map((_, r) => `t-${c}-${r}`))}
      />
    );
    const board = container.querySelector('[data-testid="blast-board"]');
    expect(board).toHaveAttribute('dir', 'rtl');
  });

  it('renders a reveal glow over the cells passed in revealGlowCells', () => {
    const { container } = render(
      <BlastBoard
        level={mockLevel}
        selection={{ kind: 'idle' }}
        invalidShakeKey={0}
        onPointerDown={vi.fn()}
        onPointerEnter={vi.fn()}
        onPointerUp={vi.fn()}
        tileIds={mockLevel.columns.map((col, c) => col.tiles.map((_, r) => `t-${c}-${r}`))}
        revealGlowCells={['c0r0', 'c1r0']}
      />
    );
    expect(container.querySelectorAll('[data-reveal-glow]').length).toBe(2);
  });
});
