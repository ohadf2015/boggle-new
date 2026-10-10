import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import LetterBoard from '../LetterBoard';
import { stubBoardLayout, selectedKeys } from './boardTestUtils';

const GRID = [
  ['C', 'A', 'T'],
  ['D', 'O', 'G'],
  ['S', 'U', 'N'],
];

function setup(extra: { disableLetterKeyInput?: boolean } = {}) {
  const onSubmit = vi.fn();
  const utils = render(<LetterBoard grid={GRID} interactive language="en" onSubmit={onSubmit} {...extra} />);
  const grid = utils.container.querySelector('[role="grid"]') as HTMLElement;
  const type = (key: string) => fireEvent.keyDown(grid, { key });
  return { ...utils, onSubmit, type };
}

let restore: () => void;
beforeEach(() => { restore = stubBoardLayout(); });
afterEach(() => restore());

describe('LetterBoard keyboard typing', () => {
  it('given typed letters that trace a path, then the board lights that path', () => {
    const { container, type } = setup();
    type('d');
    type('o');
    type('g');
    expect(selectedKeys(container)).toEqual(['1-0', '1-1', '1-2']);
  });

  it('given a typed word, when Enter is pressed, then it submits as keyboard input', () => {
    const { type, onSubmit } = setup();
    'cat'.split('').forEach(type);
    type('Enter');
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][1]).toBe('kb');
    expect((onSubmit.mock.calls[0][0] as Array<{ letter: string }>).map((c) => c.letter).join('')).toBe('CAT');
  });

  it('given a letter that cannot extend the path, then the path is unchanged', () => {
    const { container, type } = setup();
    type('c');
    type('n');
    expect(selectedKeys(container)).toEqual(['0-0']);
  });

  it('given Backspace, then the last letter is removed', () => {
    const { container, type } = setup();
    'cat'.split('').forEach(type);
    type('Backspace');
    expect(selectedKeys(container)).toEqual(['0-0', '0-1']);
  });

  it('given letter input is disabled, then typing selects nothing', () => {
    const { container, type } = setup({ disableLetterKeyInput: true });
    type('c');
    expect(selectedKeys(container)).toEqual([]);
  });

  it('given arrow keys then Enter, then the focused tile is picked', () => {
    const { container, type } = setup();
    type('ArrowRight');
    type('ArrowRight');
    type('ArrowDown');
    type('Enter');
    expect(selectedKeys(container)).toEqual(['1-1']);
  });
});
