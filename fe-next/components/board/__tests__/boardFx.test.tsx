import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import LetterBoard from '../LetterBoard';
import { clearFx, feedbackFx, releaseFx } from '../boardFx';
import { createBoardPainter } from '../boardPainter';
import { centre, stubBoardLayout } from './boardTestUtils';

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

function mount(props: { ghost?: boolean; showPreview?: boolean } = {}) {
  const { container } = render(<LetterBoard grid={GRID} interactive ghost={props.ghost} showPreview={props.showPreview} />);
  const board = container.querySelector<HTMLElement>('[data-board]')!;
  const painter = createBoardPainter(board);
  const geo = painter.measure();
  painter.setPath(CAT);
  const send = () => {
    releaseFx(board, CAT, geo);
    painter.setPath([], { keepPreview: true });
  };
  return { board, geo, send };
}

const glyph = (board: HTMLElement, key: string) => board.querySelector<HTMLElement>(`[data-gk="${key}"]`)!;

let restore: () => void;
beforeEach(() => {
  restore = stubBoardLayout();
});
afterEach(() => {
  restore();
  vi.useRealTimers();
});

describe('board release effects', () => {
  it('given a released word, then each letter leaves its tile as a flying chip in path order', () => {
    const { board, geo } = mount();
    releaseFx(board, CAT, geo);
    const flies = [...board.querySelectorAll<HTMLElement>('[data-fly]')];
    expect(flies.map((f) => f.textContent)).toEqual(['C', 'A', 'T']);
    expect(['0-0', '0-1', '0-2'].map((k) => glyph(board, k).getAttribute('data-fx'))).toEqual(['sent', 'sent', 'sent']);
    expect(glyph(board, '1-1').hasAttribute('data-fx')).toBe(false);
  });

  it('given no verdict ever arrives, then the letters return to their tiles once the flight lands', () => {
    vi.useFakeTimers();
    const { board, send } = mount();
    send();
    expect(glyph(board, '0-0').getAttribute('data-fx')).toBe('sent');
    vi.advanceTimersByTime(1000);
    expect(board.querySelector('[data-fx]')).toBeNull();
  });

  it('given the verdict landed first, then the late cleanup leaves its celebration alone', () => {
    vi.useFakeTimers();
    const { board, send } = mount();
    send();
    feedbackFx(board, 'ok', 10, 'cat');
    vi.advanceTimersByTime(700);
    expect(glyph(board, '0-0').getAttribute('data-fx')).toBe('ok');
  });

  it('given the word was accepted, then the board carries the verdict so the trail echo and chips turn to it', () => {
    const { board, send } = mount();
    send();
    expect(board.hasAttribute('data-verdict')).toBe(false);
    feedbackFx(board, 'ok', 10, 'cat');
    expect(board.getAttribute('data-verdict')).toBe('ok');
    expect(glyph(board, '0-1').getAttribute('data-fx')).toBe('ok');
  });

  it('given the word was rejected, then the verdict is bad', () => {
    const { board, send } = mount();
    send();
    feedbackFx(board, 'bad', 0, 'cat');
    expect(board.getAttribute('data-verdict')).toBe('bad');
  });

  it('given a new word starts, then the old verdict and flights are cleared', () => {
    const { board, send } = mount();
    send();
    feedbackFx(board, 'ok', 10, 'cat');
    clearFx(board);
    expect(board.hasAttribute('data-verdict')).toBe(false);
    expect(board.querySelector('[data-fly]')).toBeNull();
    expect(glyph(board, '0-0').hasAttribute('data-fx')).toBe(false);
  });

  it('given a right-to-left word bar, then the first letter lands on its right side', () => {
    const target = document.createElement('div');
    target.setAttribute('data-board-fly-target', '');
    target.setAttribute('dir', 'rtl');
    target.getBoundingClientRect = () => ({ x: 0, y: -80, left: 0, top: -80, width: 330, height: 40, right: 330, bottom: -40, toJSON: () => ({}) }) as DOMRect;
    document.body.appendChild(target);
    const frames: Keyframe[][] = [];
    const proto = HTMLElement.prototype as unknown as { animate?: unknown };
    const had = proto.animate;
    proto.animate = function (this: HTMLElement, kf: Keyframe[]) {
      if (this.hasAttribute('data-fly')) frames.push(kf);
      return { cancel() {}, pause() {} } as unknown as Animation;
    };
    try {
      const { board, geo } = mount({ showPreview: false });
      releaseFx(board, CAT, geo);
    } finally {
      proto.animate = had;
      target.remove();
    }
    const landX = (kf: Keyframe[]) => Number(/calc\(-50% \+ (-?[\d.]+)px\)/.exec(String(kf[kf.length - 1].transform))![1]);
    expect(frames).toHaveLength(3);
    const landed = frames.map((kf, i) => centre(0, i).x + landX(kf));
    expect(landed[0]).toBeGreaterThan(landed[2]);
  });
});
