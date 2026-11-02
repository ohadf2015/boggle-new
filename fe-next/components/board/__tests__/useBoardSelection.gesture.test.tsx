import React, { useLayoutEffect, useRef } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import LetterBoard from '../LetterBoard';
import { useBoardSelection } from '../useBoardSelection';
import { drag, release, selectedKeys, stubBoardLayout } from './boardTestUtils';

const GRID = [
  ['C', 'A', 'T'],
  ['D', 'O', 'G'],
  ['S', 'U', 'N'],
];

const gridOf = (container: HTMLElement) => container.querySelector('[role="grid"]') as HTMLElement;

let restore: () => void;
beforeEach(() => {
  restore = stubBoardLayout();
});
afterEach(() => {
  restore();
  vi.useRealTimers();
});

describe('useBoardSelection: interrupted gestures', () => {
  it('Given a half-drawn word, When the OS cancels the pointer, Then nothing is submitted and the path clears', () => {
    const onSubmit = vi.fn();
    const { container } = render(<LetterBoard grid={GRID} interactive onSubmit={onSubmit} />);
    act(() => {
      drag(container, [[0, 0], [0, 1], [0, 2]], 'touch');
      fireEvent.pointerCancel(gridOf(container), { pointerId: 1, pointerType: 'touch' });
    });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(selectedKeys(container)).toEqual([]);
  });

  it('Given a half-drawn word, When the grid loses pointer capture without a release, Then nothing is submitted', () => {
    const onSubmit = vi.fn();
    const { container } = render(<LetterBoard grid={GRID} interactive onSubmit={onSubmit} />);
    act(() => {
      drag(container, [[0, 0], [0, 1], [0, 2]], 'touch');
      fireEvent(gridOf(container), new PointerEvent('lostpointercapture', { pointerId: 1, pointerType: 'touch', bubbles: true }));
    });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(selectedKeys(container)).toEqual([]);
  });

  it('Given a normal release, When capture is lost right after it, Then the word is submitted exactly once', () => {
    const onSubmit = vi.fn();
    const { container } = render(<LetterBoard grid={GRID} interactive onSubmit={onSubmit} />);
    act(() => {
      drag(container, [[0, 0], [0, 1], [0, 2]], 'touch');
      release(container, 'touch');
      fireEvent(gridOf(container), new PointerEvent('lostpointercapture', { pointerId: 1, pointerType: 'touch', bubbles: true }));
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

function ReleaseOnFlip({ host, flip }: { host: React.RefObject<HTMLDivElement | null>; flip: boolean }) {
  useLayoutEffect(() => {
    if (flip && host.current) release(host.current, 'touch');
  }, [flip, host]);
  return null;
}

describe('useBoardSelection: options freshness', () => {
  it('Given the board just turned non-interactive, When a release lands in the same commit, Then the word is not submitted', () => {
    const onSubmit = vi.fn();
    function Harness({ interactive, flip }: { interactive: boolean; flip: boolean }) {
      const host = useRef<HTMLDivElement>(null);
      return (
        <div ref={host}>
          <LetterBoard grid={GRID} interactive={interactive} onSubmit={onSubmit} />
          <ReleaseOnFlip host={host} flip={flip} />
        </div>
      );
    }
    const { container, rerender } = render(<Harness interactive flip={false} />);
    act(() => { drag(container, [[0, 0], [0, 1], [0, 2]], 'touch'); });
    act(() => { rerender(<Harness interactive={false} flip />); });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

function KeyedBoard({ gridKey, onSubmit }: { gridKey: string; onSubmit: (p: unknown) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useBoardSelection(ref, { interactive: true, onSubmit });
  return (
    <div ref={ref} data-board="">
      <div key={gridKey} role="grid" tabIndex={0}>
        {GRID.map((row, r) =>
          row.map((letter, c) => (
            <div key={`${r}-${c}`} data-tile="" data-key={`${r}-${c}`} data-row={r} data-col={c} data-letter={letter} />
          )),
        )}
      </div>
    </div>
  );
}

describe('useBoardSelection: grid element swap', () => {
  it('Given the grid element is replaced, When the player drags on the new grid, Then the word still submits', () => {
    const onSubmit = vi.fn();
    const { container, rerender } = render(<KeyedBoard gridKey="a" onSubmit={onSubmit} />);
    rerender(<KeyedBoard gridKey="b" onSubmit={onSubmit} />);
    act(() => {
      drag(container, [[0, 0], [0, 1], [0, 2]], 'touch');
      release(container, 'touch');
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

});
