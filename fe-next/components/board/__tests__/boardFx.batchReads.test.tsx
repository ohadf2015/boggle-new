import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import LetterBoard from '../LetterBoard';
import { feedbackFx, releaseFx } from '../boardFx';
import { createBoardPainter } from '../boardPainter';
import { stubBoardLayout } from './boardTestUtils';

const GRID = [
  ['C', 'A', 'T'],
  ['D', 'O', 'G'],
  ['S', 'U', 'N'],
];
const CAT = [
  { row: 0, col: 0, letter: 'C' },
  { row: 0, col: 1, letter: 'A' },
  { row: 0, col: 2, letter: 'T' },
];

let restore: () => void;
const log: string[] = [];
const proto = HTMLElement.prototype as unknown as { animate?: unknown };
let hadAnimate: unknown;

beforeEach(() => {
  restore = stubBoardLayout();
  hadAnimate = proto.animate;
  proto.animate = function (this: HTMLElement) {
    const fly = this.hasAttribute('data-fly');
    if (fly) log.push('animate');
    return {
      pause() {},
      cancel() { if (fly) log.push('cancel'); },
    } as unknown as Animation;
  };
});

afterEach(() => {
  restore();
  proto.animate = hadAnimate;
  vi.restoreAllMocks();
  log.length = 0;
});

describe('boardFx: rejected word flight drop', () => {
  it('Given three letters in flight, When the word is rejected, Then every style read happens before any style write', () => {
    const { container } = render(<LetterBoard grid={GRID} interactive />);
    const board = container.querySelector<HTMLElement>('[data-board]')!;
    const painter = createBoardPainter(board);
    releaseFx(board, CAT, painter.measure());
    expect(board.querySelectorAll('[data-fly]')).toHaveLength(3);

    const realGcs = window.getComputedStyle;
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element) => {
      if (el.hasAttribute('data-fly')) log.push('read');
      return realGcs.call(window, el);
    });
    const realSet = Element.prototype.setAttribute;
    vi.spyOn(Element.prototype, 'setAttribute').mockImplementation(function (this: Element, k: string, v: string) {
      if (this.hasAttribute('data-fly')) log.push('write');
      return realSet.call(this, k, v);
    });
    log.length = 0;

    feedbackFx(board, 'bad', 0, 'cat');

    const reads = log.flatMap((e, i) => (e === 'read' ? [i] : []));
    expect(reads).toHaveLength(3);
    const firstWrite = log.findIndex((e) => e !== 'read');
    expect(firstWrite).toBeGreaterThan(reads[reads.length - 1]);
  });
});
