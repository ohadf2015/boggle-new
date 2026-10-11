import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import LetterBoard from '../LetterBoard';
import { clearFx, feedbackFx, releaseFx } from '../boardFx';
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

function mountGhost() {
  const view = render(<LetterBoard grid={GRID} interactive ghost />);
  const board = view.container.querySelector<HTMLElement>('[data-board]')!;
  const geo = createBoardPainter(board).measure();
  return { board, geo, unmount: view.unmount };
}

const overlay = () => document.querySelector<HTMLElement>('[data-board-overlay]');
const label = () => document.querySelector<HTMLElement>('[data-board-overlay] [data-lift]');

let restore: () => void;
beforeEach(() => {
  restore = stubBoardLayout();
});
afterEach(() => {
  restore();
  vi.useRealTimers();
  document.querySelectorAll('[data-board-overlay]').forEach((n) => n.remove());
});

describe('word lift on a board that another mode paints (Blast)', () => {
  it('given a released word, then it lifts as a big label outside the clipped board and its letters leave their tiles', () => {
    const { board, geo } = mountGhost();
    releaseFx(board, CAT, geo);
    expect(label()?.textContent).toBe('CAT');
    expect(board.contains(label())).toBe(false);
    const flies = [...overlay()!.querySelectorAll<HTMLElement>('[data-fly]')];
    expect(flies.map((f) => f.textContent)).toEqual(['C', 'A', 'T']);
  });

  it('given room above the board, then the word lifts into it instead of covering the top row', () => {
    const { board, geo } = mountGhost();
    const grid = board.querySelector<HTMLElement>('[role="grid"]')!;
    grid.getBoundingClientRect = () =>
      ({ x: 0, y: 300, left: 0, top: 300, width: 320, height: 320, right: 320, bottom: 620, toJSON: () => ({}) }) as DOMRect;
    releaseFx(board, CAT, geo);
    const top = parseFloat(label()!.style.top);
    expect(top).toBeLessThan(300 - 20);
    expect(top).toBeGreaterThan(200);
  });

  it('given no room above the board, then the word stays on screen', () => {
    const { board, geo } = mountGhost();
    releaseFx(board, CAT, geo);
    expect(parseFloat(label()!.style.top)).toBeGreaterThanOrEqual(20);
  });

  it('given the word is accepted, then the label takes the verdict, the points rise off it and the last tile bursts', () => {
    const { board, geo } = mountGhost();
    releaseFx(board, CAT, geo);
    feedbackFx(board, 'ok', 61, 'cat');
    expect(label()?.getAttribute('data-verdict')).toBe('ok');
    expect(overlay()!.querySelector('[data-score-float]')?.textContent).toBe('+61');
    expect(overlay()!.querySelector('[data-ring]')).not.toBeNull();
    expect(overlay()!.querySelectorAll('[data-shard]').length).toBeGreaterThanOrEqual(8);
  });

  it('given the word is rejected, then the label shakes off with no points and no burst', () => {
    const { board, geo } = mountGhost();
    releaseFx(board, CAT, geo);
    feedbackFx(board, 'bad', 0, 'cat');
    expect(label()?.getAttribute('data-verdict')).toBe('bad');
    expect(overlay()!.querySelector('[data-score-float]')).toBeNull();
    expect(overlay()!.querySelector('[data-shard]')).toBeNull();
  });

  it('given no verdict arrives, then the label leaves on its own', () => {
    vi.useFakeTimers();
    const { board, geo } = mountGhost();
    releaseFx(board, CAT, geo);
    vi.advanceTimersByTime(2500);
    expect(label()).toBeNull();
  });

  it('given a new word starts, then the previous lift is cleared', () => {
    const { board, geo } = mountGhost();
    releaseFx(board, CAT, geo);
    feedbackFx(board, 'ok', 61, 'cat');
    clearFx(board);
    expect(overlay()?.childElementCount ?? 0).toBe(0);
  });

  it('given the board unmounts, then its overlay goes with it', () => {
    const { board, geo, unmount } = mountGhost();
    releaseFx(board, CAT, geo);
    unmount();
    expect(overlay()).toBeNull();
  });
});

describe('points chip', () => {
  const firstFrames = (attr: string, run: () => void) => {
    const seen: Keyframe[][] = [];
    const proto = HTMLElement.prototype as unknown as { animate?: unknown };
    const had = proto.animate;
    proto.animate = function (this: HTMLElement, kf: Keyframe[]) {
      if (this.hasAttribute(attr)) seen.push(kf);
      return { cancel() {}, pause() {}, finished: Promise.resolve() } as unknown as Animation;
    };
    try {
      run();
    } finally {
      proto.animate = had;
    }
    return seen;
  };

  it('given a lifted word is accepted, then its points pop in solid instead of fading up through the navy', () => {
    const { board, geo } = mountGhost();
    const seen = firstFrames('data-score-float', () => {
      releaseFx(board, CAT, geo);
      feedbackFx(board, 'ok', 61, 'cat');
    });
    expect(seen).toHaveLength(1);
    expect(seen[0][0].opacity ?? 1).toBe(1);
  });

  it('given a word is accepted on a board with its own preview, then its points pop in solid too', () => {
    const { container } = render(<LetterBoard grid={GRID} interactive />);
    const board = container.querySelector<HTMLElement>('[data-board]')!;
    const seen = firstFrames('data-chip', () => {
      releaseFx(board, CAT, createBoardPainter(board).measure());
      feedbackFx(board, 'ok', 40, 'cat');
    });
    expect(seen.length).toBeGreaterThanOrEqual(1);
    expect(seen[0][0].opacity ?? 1).toBe(1);
  });
});

describe('fly target', () => {
  it('given a hidden word bar before the visible one, then the letters fly to the visible one', () => {
    const rect = (x: number, y: number, w: number, h: number) =>
      ({ x, y, left: x, top: y, width: w, height: h, right: x + w, bottom: y + h, toJSON: () => ({}) }) as DOMRect;
    const hidden = document.createElement('div');
    hidden.setAttribute('data-board-fly-target', '');
    hidden.getBoundingClientRect = () => rect(0, 0, 0, 0);
    const shown = document.createElement('div');
    shown.setAttribute('data-board-fly-target', '');
    shown.getBoundingClientRect = () => rect(0, 500, 330, 40);
    document.body.append(hidden, shown);
    const frames: Keyframe[][] = [];
    const proto = HTMLElement.prototype as unknown as { animate?: unknown };
    const had = proto.animate;
    proto.animate = function (this: HTMLElement, kf: Keyframe[]) {
      if (this.hasAttribute('data-fly')) frames.push(kf);
      return { cancel() {}, pause() {} } as unknown as Animation;
    };
    try {
      const { container } = render(<LetterBoard grid={GRID} interactive showPreview={false} />);
      const board = container.querySelector<HTMLElement>('[data-board]')!;
      releaseFx(board, CAT, createBoardPainter(board).measure());
    } finally {
      proto.animate = had;
      hidden.remove();
      shown.remove();
    }
    const landY = (kf: Keyframe[]) => Number(/calc\(-50% \+ (-?[\d.]+)px\)\) scale\(0\.45\)/.exec(String(kf[kf.length - 1].transform))![1]);
    expect(frames).toHaveLength(3);
    expect(landY(frames[0])).toBeGreaterThan(400);
  });
});
