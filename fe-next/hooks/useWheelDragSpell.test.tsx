/**
 * Shared wheel drag-to-spell hook — the pointer algorithm reused by the live
 * WordWheelGame and the practice wheel sandbox. Drag only engages once the
 * pointer moves to a DIFFERENT letter than the start (so single taps stay
 * taps); a drag-release with >= minLength letters auto-submits.
 */
import React, { useRef } from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useWheelDragSpell } from './useWheelDragSpell';

interface HarnessProps {
  addLetter: (index: number, letter: string) => void;
  submit: () => void;
  onBeforeDragSubmit?: () => void;
  builtLength: { current: number };
}

const LETTERS = ['A', 'T', 'R', 'C', 'E'];

function Harness({ addLetter, submit, onBeforeDragSubmit, builtLength }: HarnessProps) {
  const draggingRef = useRef(false);
  const pointerPosRef = useRef<{ x: number; y: number } | null>(null);
  const used = useRef<Set<number>>(new Set());
  const { handlePointerDown, handlePointerMove, handlePointerUp } = useWheelDragSpell({
    draggingRef,
    pointerPosRef,
    isIndexUsed: (i) => used.current.has(i),
    addLetter: (i, letter) => { used.current.add(i); addLetter(i, letter); },
    getBuiltLength: () => builtLength.current,
    submit,
    onBeforeDragSubmit,
  });
  return (
    <div
      data-testid="wheel"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {LETTERS.map((l, i) => (
        <button key={i} data-wheel-letter={l} data-wheel-index={i}>{l}</button>
      ))}
    </div>
  );
}

/** Map a sequence of elementFromPoint calls to wheel-letter buttons by index. */
const mockElementFromPoint = (seq: number[]) => {
  let i = 0;
  vi.spyOn(document, 'elementFromPoint').mockImplementation(() => {
    const idx = seq[Math.min(i, seq.length - 1)];
    i += 1;
    return document.querySelector(`[data-wheel-index="${idx}"]`) as Element;
  });
};

beforeEach(() => vi.restoreAllMocks());

describe('useWheelDragSpell', () => {
  it('builds the word across dragged letters and auto-submits on release', () => {
    const addLetter = vi.fn();
    const submit = vi.fn();
    const builtLength = { current: 0 };
    // addLetter bumps the built length so getBuiltLength reflects 3 at release.
    const { getByTestId } = render(
      <Harness
        addLetter={(...a) => { builtLength.current += 1; addLetter(...a); }}
        submit={submit}
        builtLength={builtLength}
      />,
    );
    const wheel = getByTestId('wheel');
    // pointerdown@1 (start=T), move@0 (A → engages, adds T then A), move@2 (R).
    mockElementFromPoint([1, 0, 2]);
    fireEvent.pointerDown(wheel, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(wheel, { clientX: 20, clientY: 10 });
    fireEvent.pointerMove(wheel, { clientX: 30, clientY: 10 });
    fireEvent.pointerUp(wheel);
    // Added start letter (1=T), then 0=A, then 2=R.
    expect(addLetter.mock.calls.map((c) => c[0])).toEqual([1, 0, 2]);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('does NOT engage (or submit) on a tap that never moves to another letter', () => {
    const addLetter = vi.fn();
    const submit = vi.fn();
    const { getByTestId } = render(
      <Harness addLetter={addLetter} submit={submit} builtLength={{ current: 0 }} />,
    );
    const wheel = getByTestId('wheel');
    mockElementFromPoint([1, 1, 1]); // pointer stays on the same letter
    fireEvent.pointerDown(wheel, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(wheel, { clientX: 11, clientY: 10 });
    fireEvent.pointerUp(wheel);
    expect(addLetter).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });

  it('does not auto-submit a drag below minLength', () => {
    const submit = vi.fn();
    const builtLength = { current: 0 };
    const { getByTestId } = render(
      <Harness
        addLetter={() => { builtLength.current += 1; }}
        submit={submit}
        builtLength={builtLength}
      />,
    );
    const wheel = getByTestId('wheel');
    mockElementFromPoint([1, 0]); // start=T, engage@A → only 2 letters built
    fireEvent.pointerDown(wheel, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(wheel, { clientX: 20, clientY: 10 });
    fireEvent.pointerUp(wheel);
    expect(builtLength.current).toBe(2);
    expect(submit).not.toHaveBeenCalled();
  });

  it('calls onBeforeDragSubmit just before a drag-release submit', () => {
    const order: string[] = [];
    const builtLength = { current: 0 };
    const { getByTestId } = render(
      <Harness
        addLetter={() => { builtLength.current += 1; }}
        submit={() => order.push('submit')}
        onBeforeDragSubmit={() => order.push('before')}
        builtLength={builtLength}
      />,
    );
    const wheel = getByTestId('wheel');
    mockElementFromPoint([1, 0, 2]);
    fireEvent.pointerDown(wheel, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(wheel, { clientX: 20, clientY: 10 });
    fireEvent.pointerMove(wheel, { clientX: 30, clientY: 10 });
    fireEvent.pointerUp(wheel);
    expect(order).toEqual(['before', 'submit']);
  });
});
