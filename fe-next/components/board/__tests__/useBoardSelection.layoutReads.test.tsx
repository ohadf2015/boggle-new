import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import LetterBoard from '../LetterBoard';
import { stubBoardLayout, tileEl } from './boardTestUtils';

const GRID = [
  ['C', 'A', 'T'],
  ['D', 'O', 'G'],
  ['S', 'U', 'N'],
];

let restore = () => {};
afterEach(() => restore());

describe('useBoardSelection layout reads', () => {
  it('given a tile press, when the board measures itself, then it reads layout before writing to the DOM', () => {
    restore = stubBoardLayout();
    const { container } = render(<LetterBoard grid={GRID} interactive />);
    const grid = container.querySelector<HTMLElement>('[role="grid"]')!;
    const stubbed = HTMLElement.prototype.getBoundingClientRect;
    let stateAtFirstRead: string | null | undefined;
    HTMLElement.prototype.getBoundingClientRect = function read(this: HTMLElement) {
      if (stateAtFirstRead === undefined) stateAtFirstRead = grid.getAttribute('data-state');
      return stubbed.call(this);
    };

    fireEvent.pointerDown(tileEl(container, 0, 0), { pointerId: 1, pointerType: 'touch', button: 0, clientX: 50, clientY: 50 });

    expect(stateAtFirstRead).toBeNull();
    expect(grid.getAttribute('data-state')).toBe('tap-1');
  });
});
