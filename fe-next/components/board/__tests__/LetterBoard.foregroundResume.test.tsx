import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import LetterBoard from '../LetterBoard';
import { stubBoardLayout, drag, release, selectedKeys } from './boardTestUtils';

const GRID = [
  ['C', 'A', 'T'],
  ['D', 'O', 'G'],
  ['S', 'U', 'N'],
];

let restore: () => void;
beforeEach(() => {
  restore = stubBoardLayout();
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
});
afterEach(() => restore());

// A native ad / app switch hides the WebView mid-swipe and pointerup never
// arrives. Before: `pressing` stayed true and every later swipe was ignored
// until the player restarted the app.
describe('LetterBoard — gesture interrupted by a WebView pause', () => {
  it('abandons the half-finished swipe on resume without submitting it, and the next swipe works', () => {
    const onSubmit = vi.fn();
    const { container } = render(<LetterBoard grid={GRID} interactive onSubmit={onSubmit} />);
    drag(container, [[0, 0], [0, 1]]);
    expect(selectedKeys(container)).toEqual(['0-0', '0-1']);

    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(selectedKeys(container)).toEqual([]);

    drag(container, [[1, 0], [1, 1], [1, 2]]);
    release(container);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect((onSubmit.mock.calls[0][0] as Array<{ letter: string }>).map((c) => c.letter).join('')).toBe('DOG');
  });
});
