// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClueBar } from '../ClueBar';
import type { Slot } from '@/lib/crossword/types';

const t = (key: string) => key;

const slot: Slot = {
  id: 'A1',
  dir: 'across',
  number: 1,
  row: 0,
  col: 0,
  length: 3,
  cells: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 },
  ],
  answer: 'cat',
  clue: 'Feline pet',
};

function setup(rtl = false) {
  const onPrev = vi.fn();
  const onNext = vi.fn();
  const onToggleDir = vi.fn();
  render(
    <ClueBar slot={slot} rtl={rtl} onPrev={onPrev} onNext={onNext} onToggleDir={onToggleDir} t={t} />,
  );
  return { onPrev, onNext, onToggleDir, bar: screen.getByText('Feline pet').closest('div') as HTMLElement };
}

/** Drag the clue bar horizontally by `dx` px. */
function swipe(el: HTMLElement, dx: number) {
  fireEvent.touchStart(el, { touches: [{ clientX: 150, clientY: 20 }] });
  fireEvent.touchEnd(el, { changedTouches: [{ clientX: 150 + dx, clientY: 20 }] });
}

describe('ClueBar swipe-to-advance', () => {
  it('swiping left advances to the next clue (LTR)', () => {
    const { onNext, onPrev } = setup();
    swipe(screen.getByText('Feline pet').parentElement as HTMLElement, -80);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrev).not.toHaveBeenCalled();
  });

  it('swiping right goes back to the previous clue (LTR)', () => {
    const { onNext, onPrev } = setup();
    swipe(screen.getByText('Feline pet').parentElement as HTMLElement, 80);
    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).not.toHaveBeenCalled();
  });

  it('flips direction in RTL — swiping left goes BACK, matching the flipped chevrons', () => {
    const { onNext, onPrev } = setup(true);
    swipe(screen.getByText('Feline pet').parentElement as HTMLElement, -80);
    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).not.toHaveBeenCalled();
  });

  it('ignores a tap or a tiny drag, so reading the clue never changes it', () => {
    const { onNext, onPrev } = setup();
    swipe(screen.getByText('Feline pet').parentElement as HTMLElement, -8);
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrev).not.toHaveBeenCalled();
  });

  it('ignores a mostly-vertical drag, so scrolling never changes the clue', () => {
    const { onNext, onPrev } = setup();
    const el = screen.getByText('Feline pet').parentElement as HTMLElement;
    fireEvent.touchStart(el, { touches: [{ clientX: 150, clientY: 20 }] });
    fireEvent.touchEnd(el, { changedTouches: [{ clientX: 100, clientY: 200 }] });
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrev).not.toHaveBeenCalled();
  });
});
