import React, { useRef } from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useWheelDragSpell } from './useWheelDragSpell';

// A (x=0) — center N (x=100) — W (x=200) on one line.
const SPOTS = [
  { idx: 0, letter: 'A', x: 0 },
  { idx: -1, letter: 'N', x: 100 },
  { idx: 1, letter: 'W', x: 200 },
];

function Harness({ added, submit }: { added: number[]; submit: () => void }) {
  const draggingRef = useRef(false);
  const pointerPosRef = useRef<{ x: number; y: number } | null>(null);
  const used = useRef<Set<number>>(new Set());
  const h = useWheelDragSpell({
    draggingRef,
    pointerPosRef,
    isIndexUsed: (i) => used.current.has(i),
    addLetter: (i) => { used.current.add(i); added.push(i); },
    getBuiltLength: () => added.length,
    submit,
  });
  return (
    <div data-testid="wheel" onPointerDown={h.handlePointerDown} onPointerMove={h.handlePointerMove} onPointerUp={h.handlePointerUp}>
      {SPOTS.map((s) => <button key={s.idx} data-wheel-letter={s.letter} data-wheel-index={s.idx}>{s.letter}</button>)}
    </div>
  );
}

beforeEach(() => {
  vi.spyOn(document, 'elementFromPoint').mockImplementation((x: number) => {
    const hit = SPOTS.find((s) => Math.abs(s.x - x) <= 30);
    return hit ? document.querySelector(`[data-wheel-index="${hit.idx}"]`) : null;
  });
});
afterEach(() => vi.restoreAllMocks());

describe('word wheel center letter behaves like the outer letters', () => {
  it('joins a drag the instant the pointer reaches it', () => {
    const added: number[] = [];
    const wheel = render(<Harness added={added} submit={vi.fn()} />).getByTestId('wheel');
    fireEvent.pointerDown(wheel, { clientX: 0, clientY: 0 });
    fireEvent.pointerMove(wheel, { clientX: 100, clientY: 0 });
    expect(added).toEqual([0, -1]);
    fireEvent.pointerMove(wheel, { clientX: 200, clientY: 0 });
    expect(added).toEqual([0, -1, 1]);
  });

  it('can start a drag', () => {
    const added: number[] = [];
    const submit = vi.fn();
    const wheel = render(<Harness added={added} submit={submit} />).getByTestId('wheel');
    fireEvent.pointerDown(wheel, { clientX: 100, clientY: 0 });
    fireEvent.pointerMove(wheel, { clientX: 200, clientY: 0 });
    fireEvent.pointerMove(wheel, { clientX: 0, clientY: 0 });
    fireEvent.pointerUp(wheel);
    expect(added).toEqual([-1, 1, 0]);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('the live daily wheel does not defer the center letter', () => {
    const src = readFileSync(path.join(process.cwd(), 'components/daily/WordWheelGame.tsx'), 'utf8');
    expect(src).not.toMatch(/hubIndex:\s*-1/);
  });
});
