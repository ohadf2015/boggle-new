/**
 * WordWheelPixiRing — container-resize regression.
 *
 * The ring sizes its Pixi canvas ONCE in setup() from a single
 * getBoundingClientRect(), and derives cx/cy from that snapshot. The wheel box
 * it decorates is sized by container queries (`100cqb`) and `svh` caps, so it
 * shrinks/grows AFTER mount (short viewports, orientation change, the word
 * builder appearing above it). When that happened the canvas kept its
 * mount-time size while the letters re-laid out around a new centre — the
 * connector lines, orbital dots and centre pulse all drew ~100px off the tiles.
 *
 * Measured on 2026-08-06: orbit box 176×176 with a stale 444×444 canvas.
 */
import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const captured = vi.hoisted(() => ({
  graphicsInstances: [] as Array<{
    clear: ReturnType<typeof vi.fn>;
    circle: ReturnType<typeof vi.fn>;
    moveTo: ReturnType<typeof vi.fn>;
    lineTo: ReturnType<typeof vi.fn>;
    fill: ReturnType<typeof vi.fn>;
    stroke: ReturnType<typeof vi.fn>;
  }>,
  resizeCalls: [] as Array<[number, number]>,
}));

vi.mock('pixi.js', () => {
  class MockGraphics {
    clear = vi.fn().mockReturnThis();
    circle = vi.fn().mockReturnThis();
    moveTo = vi.fn().mockReturnThis();
    lineTo = vi.fn().mockReturnThis();
    fill = vi.fn().mockReturnThis();
    stroke = vi.fn().mockReturnThis();
    destroyed = false;
    constructor() { captured.graphicsInstances.push(this as unknown as typeof captured.graphicsInstances[0]); }
  }
  class MockApplication {
    stage = { addChild: vi.fn() };
    ticker = { stop: vi.fn() };
    canvas = document.createElement('canvas');
    renderer = { resize: vi.fn((w: number, h: number) => { captured.resizeCalls.push([w, h]); }) };
    init = vi.fn().mockResolvedValue(undefined);
    render = vi.fn();
    destroy = vi.fn();
  }
  return { Application: MockApplication, Graphics: MockGraphics };
});

import WordWheelPixiRing from '../WordWheelPixiRing';

let rafCb: ((time: number) => void) | null = null;
let simTime = 0;
const tick = (deltaMS = 16) => { simTime += deltaMS; rafCb?.(simTime); };

// One controllable ResizeObserver so the test can simulate the box shrinking.
let roCallbacks: Array<() => void> = [];
const fireResize = () => act(() => { roCallbacks.forEach(cb => cb()); });

let boxSize = { width: 300, height: 300 };

beforeEach(() => {
  captured.graphicsInstances.length = 0;
  captured.resizeCalls.length = 0;
  rafCb = null;
  simTime = 0;
  roCallbacks = [];
  boxSize = { width: 300, height: 300 };

  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { rafCb = cb; return 1; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  vi.spyOn(performance, 'now').mockImplementation(() => simTime);
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => ({
    width: boxSize.width, height: boxSize.height, top: 0, left: 0,
    right: boxSize.width, bottom: boxSize.height, x: 0, y: 0, toJSON: () => ({}),
  } as DOMRect));

  vi.stubGlobal('ResizeObserver', class {
    constructor(cb: () => void) { roCallbacks.push(cb); }
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});

const lineGfx = () => captured.graphicsInstances[1];

describe('WordWheelPixiRing — re-centres when the wheel box resizes', () => {
  it('GIVEN the box shrinks after mount WHEN a frame draws THEN vertices use the NEW centre', async () => {
    render(<WordWheelPixiRing selectedIndices={[-1, 1]} radius={100} combo={0} />);
    await waitFor(() => expect(captured.graphicsInstances.length).toBeGreaterThanOrEqual(3));
    tick();

    // Sanity: mounted at 300×300 → centre 150,150 (the centre letter vertex).
    expect(lineGfx().circle.mock.calls.some(([x, y]) => x === 150 && y === 150)).toBe(true);

    lineGfx().circle.mockClear();
    boxSize = { width: 200, height: 200 };
    fireResize();
    tick();

    // New centre is 100,100. The stale 150,150 must be gone.
    expect(lineGfx().circle.mock.calls.some(([x, y]) => x === 100 && y === 100)).toBe(true);
    expect(lineGfx().circle.mock.calls.some(([x, y]) => x === 150 && y === 150)).toBe(false);
  });

  it('GIVEN the box shrinks THEN the Pixi renderer is resized to match', async () => {
    render(<WordWheelPixiRing selectedIndices={[0]} radius={100} combo={0} />);
    await waitFor(() => expect(captured.graphicsInstances.length).toBeGreaterThanOrEqual(3));

    boxSize = { width: 200, height: 240 };
    fireResize();

    expect(captured.resizeCalls).toContainEqual([200, 240]);
  });

  it('GIVEN the box is 0×0 at mount WHEN it gains size THEN the ring still initialises', async () => {
    boxSize = { width: 0, height: 0 };
    render(<WordWheelPixiRing selectedIndices={[0]} radius={100} combo={0} />);

    // Nothing drawn yet — Pixi cannot init on a zero-sized canvas.
    expect(captured.graphicsInstances.length).toBe(0);

    boxSize = { width: 320, height: 320 };
    fireResize();

    await waitFor(() => expect(captured.graphicsInstances.length).toBeGreaterThanOrEqual(3));
  });

  it('GIVEN two resizes race the async init THEN the drawn centre matches the FINAL box', async () => {
    boxSize = { width: 0, height: 0 };
    render(<WordWheelPixiRing selectedIndices={[-1]} radius={40} combo={0} />);

    // Both fire before app.init() has resolved: the first starts setup(), the
    // second lands in the resize branch while the renderer may not exist yet.
    boxSize = { width: 320, height: 320 };
    fireResize();
    boxSize = { width: 240, height: 240 };
    fireResize();

    await waitFor(() => expect(captured.graphicsInstances.length).toBeGreaterThanOrEqual(3));
    lineGfx().circle.mockClear();
    tick();

    // 240/2 = 120. A centre of 160 would mean the in-flight setup() won and the
    // canvas is drawing against a box that no longer exists.
    expect(lineGfx().circle.mock.calls.some(([x, y]) => x === 120 && y === 120)).toBe(true);
  });
});
