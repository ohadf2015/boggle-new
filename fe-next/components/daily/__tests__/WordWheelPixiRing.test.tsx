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
  tickerListeners: [] as Array<(t: { deltaMS: number }) => void>,
}));

vi.mock('pixi.js', () => {
  class MockGraphics {
    clear = vi.fn().mockReturnThis();
    circle = vi.fn().mockReturnThis();
    moveTo = vi.fn().mockReturnThis();
    lineTo = vi.fn().mockReturnThis();
    fill = vi.fn().mockReturnThis();
    stroke = vi.fn().mockReturnThis();
    constructor() { captured.graphicsInstances.push(this as unknown as typeof captured.graphicsInstances[0]); }
  }
  class MockTicker {
    add = vi.fn((fn: (t: { deltaMS: number }) => void) => { captured.tickerListeners.push(fn); });
  }
  class MockApplication {
    stage = { addChild: vi.fn() };
    ticker = new MockTicker();
    canvas = document.createElement('canvas');
    init = vi.fn().mockResolvedValue(undefined);
    destroy = vi.fn();
  }
  return { Application: MockApplication, Graphics: MockGraphics };
});

import WordWheelPixiRing from '../WordWheelPixiRing';

const tick = (deltaMS = 16) => captured.tickerListeners.forEach((fn) => fn({ deltaMS }));

// jsdom getBoundingClientRect returns 0×0 — override so setup() doesn't bail
beforeEach(() => {
  captured.graphicsInstances.length = 0;
  captured.tickerListeners.length = 0;
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
