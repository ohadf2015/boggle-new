import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import LetterBoard, { type LetterBoardProps } from '../LetterBoard';
import { stubBoardLayout, drag, release, press, moveTo, selectedKeys, tileEl } from './boardTestUtils';

const GRID = [
  ['C', 'A', 'T'],
  ['D', 'O', 'G'],
  ['S', 'U', 'N'],
];

function setup(props: Partial<LetterBoardProps> = {}) {
  const onSubmit = vi.fn();
  const onPathChange = vi.fn();
  const onSingleTap = vi.fn();
  const utils = render(
    <LetterBoard
      grid={GRID}
      interactive
      onSubmit={onSubmit}
      onPathChange={onPathChange}
      onSingleTap={onSingleTap}
      {...props}
    />,
  );
  return { ...utils, onSubmit, onPathChange, onSingleTap };
}

const word = (call: unknown[]) => (call[0] as Array<{ letter: string }>).map((c) => c.letter).join('');

let restore: () => void;
beforeEach(() => {
  restore = stubBoardLayout();
});
afterEach(() => {
  restore();
  vi.useRealTimers();
});

describe('LetterBoard drag selection', () => {
  it('given a drag across three tiles, when released, then the word is submitted as a drag', () => {
    const { container, onSubmit } = setup();
    drag(container, [[0, 0], [0, 1], [0, 2]]);
    release(container);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(word(onSubmit.mock.calls[0])).toBe('CAT');
    expect(onSubmit.mock.calls[0][1]).toBe('drag');
  });

  it('given a drag in progress, then tiles are marked straight on the DOM in path order', () => {
    const { container } = setup();
    drag(container, [[1, 0], [1, 1], [1, 2]]);
    expect(selectedKeys(container)).toEqual(['1-0', '1-1', '1-2']);
    expect(tileEl(container, 1, 2).hasAttribute('data-head')).toBe(true);
    expect(tileEl(container, 1, 1).hasAttribute('data-head')).toBe(false);
    expect(tileEl(container, 1, 1).getAttribute('aria-selected')).toBe('true');
  });

  it('given a drag in progress, then the live preview spells the word letter by letter', () => {
    const { container } = setup();
    drag(container, [[1, 0], [1, 1], [1, 2]]);
    const letters = [...container.querySelectorAll('[data-preview-word] [data-pl]')].map((n) => n.textContent);
    expect(letters).toEqual(['D', 'O', 'G']);
    expect(container.querySelector('[data-board]')?.getAttribute('data-len')).toBe('3');
  });

  it('given a drag, then the trail runs through every selected tile centre', () => {
    const { container } = setup();
    drag(container, [[0, 0], [1, 1], [2, 2]]);
    const pts = container.querySelector('[data-trail="core"]')?.getAttribute('points')?.trim().split(/\s+/);
    expect(pts).toEqual(['50.0,50.0', '160.0,160.0', '270.0,270.0']);
  });

  it('given the finger goes back onto the previous tile, then the last tile is dropped', () => {
    const { container } = setup();
    drag(container, [[0, 0], [0, 1], [0, 2], [0, 1]]);
    expect(selectedKeys(container)).toEqual(['0-0', '0-1']);
    expect(tileEl(container, 0, 2).hasAttribute('data-sel')).toBe(false);
  });

  it('given a fast swipe that jumps over a tile, then the skipped tile is still picked up', () => {
    const { container } = setup();
    drag(container, [[0, 0], [0, 2]]);
    expect(selectedKeys(container)).toEqual(['0-0', '0-1', '0-2']);
  });

  it('given a cell filter that blocks a tile, then the drag cannot enter it', () => {
    const { container } = setup({ canEnter: (cell) => !(cell.row === 0 && cell.col === 1) });
    drag(container, [[0, 0], [0, 1]]);
    expect(selectedKeys(container)).toEqual(['0-0']);
  });

  it('given an adjacency override, then a far tile can be linked', () => {
    const { container } = setup({ adjacent: () => true });
    press(container, 0, 0);
    const grid = container.querySelector('[role="grid"]') as HTMLElement;
    // Jump straight to the far corner, as a portal would allow, without crossing the middle.
    fireEvent.pointerMove(grid, { clientX: 50, clientY: 270, pointerId: 1, pointerType: 'mouse' });
    fireEvent.pointerMove(grid, { clientX: 270, clientY: 270, pointerId: 1, pointerType: 'mouse' });
    expect(selectedKeys(container)).toContain('2-2');
  });

  it('reports each path change, not each pointer move', () => {
    const { container, onPathChange } = setup();
    press(container, 0, 0);
    moveTo(container, 0, 0);
    moveTo(container, 0, 0);
    moveTo(container, 0, 1);
    const lengths = onPathChange.mock.calls.map((c) => (c[0] as unknown[]).length);
    expect(lengths).toEqual([1, 2]);
  });

  it('given the board is not interactive, then nothing is selected', () => {
    const { container, onSubmit } = setup({ interactive: false });
    drag(container, [[0, 0], [0, 1], [0, 2]]);
    release(container);
    expect(selectedKeys(container)).toEqual([]);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('given a release, then the selection is cleared from the tiles', () => {
    const { container } = setup();
    drag(container, [[0, 0], [0, 1], [0, 2]]);
    release(container);
    expect(selectedKeys(container)).toEqual([]);
  });
});

describe('LetterBoard taps and clicks', () => {
  it('given a touch tap with no movement, then it is reported as a single tap and nothing submits', () => {
    const { container, onSubmit, onSingleTap } = setup();
    press(container, 2, 1, 'touch');
    release(container, 'touch');
    expect(onSingleTap).toHaveBeenCalledWith(expect.objectContaining({ row: 2, col: 1, letter: 'U' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(selectedKeys(container)).toEqual([]);
  });

  it('given mouse clicks on adjacent tiles, when the last tile is clicked again, then the word submits', () => {
    const { container, onSubmit } = setup();
    for (const [r, c] of [[0, 0], [0, 1], [0, 2]] as const) {
      press(container, r, c);
      release(container);
    }
    expect(selectedKeys(container)).toEqual(['0-0', '0-1', '0-2']);
    press(container, 0, 2);
    release(container);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(word(onSubmit.mock.calls[0])).toBe('CAT');
  });

  it('given a right click, then the last letter is undone', () => {
    const { container } = setup();
    press(container, 0, 0);
    release(container);
    press(container, 0, 1);
    release(container);
    fireEvent.contextMenu(container.querySelector('[role="grid"]')!);
    expect(selectedKeys(container)).toEqual(['0-0']);
  });

  it('given a click-built word, when the player clicks outside the board, then it submits', () => {
    const { container, onSubmit } = setup();
    for (const [r, c] of [[0, 0], [0, 1]] as const) {
      press(container, r, c);
      release(container);
    }
    fireEvent.pointerDown(document.body, { pointerId: 2, pointerType: 'mouse' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('given Escape during a click-built word, then it is cleared without submitting', () => {
    const { container, onSubmit } = setup();
    press(container, 0, 0);
    release(container);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(selectedKeys(container)).toEqual([]);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('LetterBoard auto-submit', () => {
  it('given a desktop selection of 3+ letters left idle, then it submits after the idle window', () => {
    vi.useFakeTimers();
    const { container, onSubmit } = setup({ autoSubmitIdleMs: 1000 });
    drag(container, [[0, 0], [0, 1], [0, 2]]);
    act(() => { vi.advanceTimersByTime(999); });
    expect(onSubmit).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(2); });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    release(container);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('given a touch drag paused on the last tile, then idle auto-submit never fires', () => {
    vi.useFakeTimers();
    const { container, onSubmit } = setup({ autoSubmitIdleMs: 1000 });
    drag(container, [[0, 0], [0, 1], [0, 2]], 'touch');
    act(() => { vi.advanceTimersByTime(3000); });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('given a combo and a touch finger held on 3+ letters, then the word chains after 500ms', () => {
    vi.useFakeTimers();
    const { container, onSubmit } = setup({ comboLevel: 2 });
    drag(container, [[0, 0], [0, 1], [0, 2]], 'touch');
    act(() => { vi.advanceTimersByTime(520); });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
