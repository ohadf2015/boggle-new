/**
 * WordWheelPixiRing — Phase A + B tests
 * Phase A: connector line brightness (alpha/width bump)
 * Phase B: live drag line from last letter to pointer position
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted state (must precede vi.mock so the factory can access them) ───────
const captured = vi.hoisted(() => ({
  graphicsInstances: [] as Array<{
    clear: ReturnType<typeof vi.fn>;
    circle: ReturnType<typeof vi.fn>;
    moveTo: ReturnType<typeof vi.fn>;
    lineTo: ReturnType<typeof vi.fn>;
    fill: ReturnType<typeof vi.fn>;
    stroke: ReturnType<typeof vi.fn>;
  }>,
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
  class MockTicker {
    stop = vi.fn();
  }
  class MockApplication {
    stage = { addChild: vi.fn() };
    ticker = new MockTicker();
    canvas = document.createElement('canvas');
    init = vi.fn().mockResolvedValue(undefined);
    render = vi.fn();
    destroy = vi.fn();
  }
  return { Application: MockApplication, Graphics: MockGraphics };
});

import WordWheelPixiRing from '../WordWheelPixiRing';

// The component now drives its own rAF loop (no more app.ticker.add) so tests
// capture the scheduled callback directly and control the clock via
// performance.now(), rather than invoking captured ticker listeners.
let rafCb: ((time: number) => void) | null = null;
let simTime = 0;
const tick = (deltaMS = 16) => { simTime += deltaMS; rafCb?.(simTime); };

// jsdom getBoundingClientRect returns 0×0 — override so setup() doesn't bail
beforeEach(() => {
  captured.graphicsInstances.length = 0;
  rafCb = null;
  simTime = 0;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { rafCb = cb; return 1; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  vi.spyOn(performance, 'now').mockImplementation(() => simTime);
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 300, height: 300, top: 0, left: 0, right: 300, bottom: 300, x: 0, y: 0,
    toJSON: () => ({}),
  } as DOMRect);
});

// orbitGfx=0, lineGfx=1, glowGfx=2 (order of `new Graphics()` calls in PixiRing)
const lineGfx = () => captured.graphicsInstances[1];

// ── Phase A: connector brightness ────────────────────────────────────────────
describe('WordWheelPixiRing — connector line brightness', () => {
  it('draws core line with alpha 0.85 and width 4', async () => {
    render(<WordWheelPixiRing selectedIndices={[0, 1]} radius={80} combo={0} />);
    await waitFor(() => expect(captured.graphicsInstances.length).toBeGreaterThanOrEqual(3));
    tick();
    const coreCall = lineGfx().stroke.mock.calls.find(
      ([arg]) => (arg as Record<string, number>)?.alpha === 0.85,
    );
    expect(coreCall).toBeDefined();
    expect((coreCall![0] as Record<string, number>).width).toBe(4);
  });

  it('draws glow line with alpha 0.35 and width 10', async () => {
    render(<WordWheelPixiRing selectedIndices={[0, 1]} radius={80} combo={0} />);
    await waitFor(() => expect(captured.graphicsInstances.length).toBeGreaterThanOrEqual(3));
    tick();
    const glowCall = lineGfx().stroke.mock.calls.find(
      ([arg]) => (arg as Record<string, number>)?.alpha === 0.35,
    );
    expect(glowCall).toBeDefined();
    expect((glowCall![0] as Record<string, number>).width).toBe(10);
  });

  it('draws vertex dots with alpha 0.8', async () => {
    render(<WordWheelPixiRing selectedIndices={[0, 1]} radius={80} combo={0} />);
    await waitFor(() => expect(captured.graphicsInstances.length).toBeGreaterThanOrEqual(3));
    tick();
    const dotFill = lineGfx().fill.mock.calls.find(
      ([arg]) => (arg as Record<string, number>)?.alpha === 0.8,
    );
    expect(dotFill).toBeDefined();
  });
});

// ── Phase C: outer-count-aware angle (Sealed Bid's 7-letter wheel) ─────────────
describe('WordWheelPixiRing — outerCount angle', () => {
  it('defaults to 60° spacing (6-letter wheel) when outerCount is omitted', async () => {
    render(<WordWheelPixiRing selectedIndices={[0, 1]} radius={100} combo={0} />);
    await waitFor(() => expect(captured.graphicsInstances.length).toBeGreaterThanOrEqual(3));
    tick();
    // Mocked getBoundingClientRect is 300×300, so cx = cy = 150.
    const rad = (1 * 60 * Math.PI) / 180;
    const expectedX = 150 + Math.sin(rad) * 100;
    const expectedY = 150 - Math.cos(rad) * 100;
    const moveCall = lineGfx().lineTo.mock.calls.find(
      ([x, y]) => Math.abs(x - expectedX) < 0.01 && Math.abs(y - expectedY) < 0.01,
    );
    expect(moveCall).toBeDefined();
  });

  it('spaces vertices at 360/outerCount degrees for a 7-letter wheel', async () => {
    render(<WordWheelPixiRing selectedIndices={[0, 1]} radius={100} combo={0} outerCount={7} />);
    await waitFor(() => expect(captured.graphicsInstances.length).toBeGreaterThanOrEqual(3));
    tick();
    const rad = (1 * (360 / 7) * Math.PI) / 180;
    const expectedX = 150 + Math.sin(rad) * 100;
    const expectedY = 150 - Math.cos(rad) * 100;
    const moveCall = lineGfx().lineTo.mock.calls.find(
      ([x, y]) => Math.abs(x - expectedX) < 0.01 && Math.abs(y - expectedY) < 0.01,
    );
    expect(moveCall).toBeDefined();
    // The stale 60°-based point must NOT appear — that's the misaligned-trail bug.
    const staleRad = (1 * 60 * Math.PI) / 180;
    const staleX = 150 + Math.sin(staleRad) * 100;
    const staleY = 150 - Math.cos(staleRad) * 100;
    const staleCall = lineGfx().lineTo.mock.calls.find(
      ([x, y]) => Math.abs(x - staleX) < 0.01 && Math.abs(y - staleY) < 0.01,
    );
    expect(staleCall).toBeUndefined();
  });
});

// ── Phase B: live drag line ───────────────────────────────────────────────────
describe('WordWheelPixiRing — live drag line', () => {
  it('draws drag line (alpha 0.5) when isDraggingRef=true and pointerPosRef has position', async () => {
    const pointerPosRef = { current: { x: 150, y: 100 } } as React.MutableRefObject<{ x: number; y: number } | null>;
    const isDraggingRef = { current: true } as React.MutableRefObject<boolean>;

    render(
      <WordWheelPixiRing
        selectedIndices={[0]}
        radius={80}
        combo={0}
        pointerPosRef={pointerPosRef}
        isDraggingRef={isDraggingRef}
      />,
    );
    await waitFor(() => expect(captured.graphicsInstances.length).toBeGreaterThanOrEqual(3));
    tick();
    const dragLine = lineGfx().stroke.mock.calls.find(
      ([arg]) => (arg as Record<string, number>)?.alpha === 0.5,
    );
    expect(dragLine).toBeDefined();
  });

  it('does NOT draw drag line when isDraggingRef=false', async () => {
    const pointerPosRef = { current: { x: 150, y: 100 } } as React.MutableRefObject<{ x: number; y: number } | null>;
    const isDraggingRef = { current: false } as React.MutableRefObject<boolean>;

    render(
      <WordWheelPixiRing
        selectedIndices={[0]}
        radius={80}
        combo={0}
        pointerPosRef={pointerPosRef}
        isDraggingRef={isDraggingRef}
      />,
    );
    await waitFor(() => expect(captured.graphicsInstances.length).toBeGreaterThanOrEqual(3));
    tick();
    const dragLine = lineGfx().stroke.mock.calls.find(
      ([arg]) => (arg as Record<string, number>)?.alpha === 0.5,
    );
    expect(dragLine).toBeUndefined();
  });

  it('does NOT draw drag line when pointerPosRef.current is null', async () => {
    const pointerPosRef = { current: null } as React.MutableRefObject<{ x: number; y: number } | null>;
    const isDraggingRef = { current: true } as React.MutableRefObject<boolean>;

    render(
      <WordWheelPixiRing
        selectedIndices={[0]}
        radius={80}
        combo={0}
        pointerPosRef={pointerPosRef}
        isDraggingRef={isDraggingRef}
      />,
    );
    await waitFor(() => expect(captured.graphicsInstances.length).toBeGreaterThanOrEqual(3));
    tick();
    const dragLine = lineGfx().stroke.mock.calls.find(
      ([arg]) => (arg as Record<string, number>)?.alpha === 0.5,
    );
    expect(dragLine).toBeUndefined();
  });
});

/**
 * Regression for Sentry JAVASCRIPT-NEXTJS-1PV: "Cannot read properties of
 * null (reading 'clear')". Pixi's own TickerPlugin used to render every frame
 * via a listener we couldn't guard; the fix drives our own rAF loop instead so
 * unmount can cancelAnimationFrame() the exact pending frame directly.
 */
describe('WordWheelPixiRing — rAF cleanup on unmount', () => {
  it('cancels its own pending animation frame on unmount', async () => {
    const { unmount } = render(<WordWheelPixiRing selectedIndices={[0, 1]} radius={80} combo={0} />);
    await waitFor(() => expect(captured.graphicsInstances.length).toBeGreaterThanOrEqual(3));

    unmount();

    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1);
  });

  it('does not throw if a frame the browser already queued fires after unmount', async () => {
    const { unmount } = render(<WordWheelPixiRing selectedIndices={[0, 1]} radius={80} combo={0} />);
    await waitFor(() => expect(captured.graphicsInstances.length).toBeGreaterThanOrEqual(3));

    unmount();

    // cancelAnimationFrame is a no-op spy here (matches a real browser frame
    // that was already dispatched before cancellation could take effect).
    expect(() => tick()).not.toThrow();
  });
});
