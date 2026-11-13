import React, { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import WheelTrail from '../WheelTrail';

let frames: FrameRequestCallback[] = [];
const runFrames = (n: number) => {
  for (let i = 0; i < n; i++) {
    const queued = frames;
    frames = [];
    queued.forEach((cb) => cb(performance.now()));
  }
};

beforeEach(() => {
  frames = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', () => {});
});
afterEach(() => vi.unstubAllGlobals());

function setup(dragging: boolean) {
  const disc = document.createElement('div');
  const rect = vi.fn(() => ({ left: 0, top: 0, width: 200, height: 200 }) as DOMRect);
  disc.getBoundingClientRect = rect;
  const discRef = createRef<HTMLDivElement>() as React.MutableRefObject<HTMLDivElement | null>;
  discRef.current = disc;
  const draggingRef = { current: dragging };
  const pointerPosRef = { current: { x: 100, y: 50 } as { x: number; y: number } | null };
  render(
    <WheelTrail indices={[0, 1]} outerCount={6} discRef={discRef} pointerPosRef={pointerPosRef} draggingRef={draggingRef} fx={null} reducedMotion={false} />,
  );
  return { rect, draggingRef, pointerPosRef };
}

describe('WheelTrail layout reads', () => {
  it('Given tapped letters and no drag, When frames pass, Then it never forces a layout read', () => {
    const { rect } = setup(false);
    runFrames(30);
    expect(rect).not.toHaveBeenCalled();
  });

  it('Given a drag, When the finger moves over many frames, Then the disc is measured once and the tail follows', () => {
    const { rect, pointerPosRef } = setup(true);
    runFrames(5);
    pointerPosRef.current = { x: 150, y: 150 };
    runFrames(5);
    expect(rect).toHaveBeenCalledTimes(1);
    const tail = screen.getByTestId('wheel-trail').querySelectorAll('line')[1];
    expect(tail.getAttribute('x2')).toBe('75');
    expect(tail.getAttribute('visibility')).toBe('visible');
  });

  it('Given a drag ends and a new one starts, When frames pass, Then the disc is re-measured for the new drag', () => {
    const { rect, draggingRef } = setup(true);
    runFrames(3);
    draggingRef.current = false;
    runFrames(3);
    draggingRef.current = true;
    runFrames(3);
    expect(rect).toHaveBeenCalledTimes(2);
  });
});
