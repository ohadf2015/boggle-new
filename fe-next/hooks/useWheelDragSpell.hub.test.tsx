import React, { useRef } from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useWheelDragSpell, HUB_REST_MIN_MS } from './useWheelDragSpell';

// A (x=0) — hub N (x=100) — W (x=200) on one line, T straight above the hub.
const SPOTS = [
  { idx: 0, letter: 'A', x: 0, y: 0 },
  { idx: -1, letter: 'N', x: 100, y: 0 },
  { idx: 1, letter: 'W', x: 200, y: 0 },
  { idx: 2, letter: 'T', x: 100, y: -100 },
];
const HIT_R = 30;

function Harness({ added, submit }: { added: number[]; submit: () => void }) {
  const draggingRef = useRef(false);
  const pointerPosRef = useRef<{ x: number; y: number } | null>(null);
  const used = useRef<Set<number>>(new Set());
  const { handlePointerDown, handlePointerMove, handlePointerUp } = useWheelDragSpell({
    draggingRef,
    pointerPosRef,
    hubIndex: -1,
    isIndexUsed: (i) => used.current.has(i),
    addLetter: (i) => { used.current.add(i); added.push(i); },
    getBuiltLength: () => added.length,
    submit,
  });
  return (
    <div data-testid="wheel" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
      {SPOTS.map((s) => (
        <button key={s.idx} data-wheel-letter={s.letter} data-wheel-index={s.idx}>{s.letter}</button>
      ))}
    </div>
  );
}

const setup = () => {
  const added: number[] = [];
  const submit = vi.fn();
  const wheel = render(<Harness added={added} submit={submit} />).getByTestId('wheel');
  const move = (x: number, y = 0, waitMs = 10) => {
    act(() => { vi.advanceTimersByTime(waitMs); });
    fireEvent.pointerMove(wheel, { clientX: x, clientY: y });
  };
  fireEvent.pointerDown(wheel, { clientX: 0, clientY: 0 });
  return { added, submit, wheel, move };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(document, 'elementFromPoint').mockImplementation((x: number, y: number) => {
    const hit = SPOTS.find((s) => Math.hypot(s.x - x, s.y - y) <= HIT_R);
    return hit ? document.querySelector(`[data-wheel-index="${hit.idx}"]`) : null;
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useWheelDragSpell hub pass-through', () => {
  it('given a quick straight swipe across the hub, when it reaches the far letter, then the hub is skipped', () => {
    const { added, move } = setup();
    [40, 80, 110, 150, 200].forEach((x) => move(x));
    expect(added).toEqual([0, 1]);
  });

  it('given the pointer rests on the hub, when the dwell passes, then the hub is taken at once', () => {
    const { added, move } = setup();
    [40, 100].forEach((x) => move(x));
    expect(added).toEqual([0]);
    act(() => { vi.advanceTimersByTime(HUB_REST_MIN_MS + 5); });
    expect(added).toEqual([0, -1]);
    [150, 200].forEach((x) => move(x));
    expect(added).toEqual([0, -1, 1]);
  });

  it('given the dwell timer is starved, when the pointer leaves after resting long enough, then the hub is still taken', () => {
    const { added, wheel } = setup();
    fireEvent.pointerMove(wheel, { clientX: 100, clientY: 0 });
    vi.setSystemTime(Date.now() + HUB_REST_MIN_MS + 40);
    fireEvent.pointerMove(wheel, { clientX: 200, clientY: 0 });
    expect(added).toEqual([0, -1, 1]);
  });

  it('given a sparse pointer that crosses the hub at its usual pace, then the hub is skipped', () => {
    const { added, move } = setup();
    [25, 50, 75, 100, 125, 150, 175, 200].forEach((x) => move(x, 0, 220));
    expect(added).toEqual([0, 1]);
  });

  it('given a sparse pointer that pauses on the hub well past its pace, then the hub is taken', () => {
    const { added, move } = setup();
    [25, 50, 75, 100].forEach((x) => move(x, 0, 220));
    [125, 150, 175, 200].forEach((x, i) => move(x, 0, i === 0 ? 700 : 220));
    expect(added).toEqual([0, -1, 1]);
  });

  it('given a turn inside the hub, when the pointer leaves sideways, then the hub is taken before the next letter', () => {
    const { added, move } = setup();
    [40, 100].forEach((x) => move(x));
    [-40, -100].forEach((y) => move(100, y));
    expect(added).toEqual([0, -1, 2]);
  });

  it('given the pointer is released on the hub, then the hub is taken before the drag submits', () => {
    const { added, submit, wheel, move } = setup();
    move(200);
    move(100);
    fireEvent.pointerUp(wheel);
    expect(added).toEqual([0, 1, -1]);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('given a drag that starts on the hub, then the hub is the first letter', () => {
    const added: number[] = [];
    const wheel = render(<Harness added={added} submit={vi.fn()} />).getByTestId('wheel');
    fireEvent.pointerDown(wheel, { clientX: 100, clientY: 0 });
    fireEvent.pointerMove(wheel, { clientX: 200, clientY: 0 });
    expect(added).toEqual([-1, 1]);
  });
});
