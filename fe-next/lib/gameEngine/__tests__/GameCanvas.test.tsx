/**
 * Regression for Sentry JAVASCRIPT-NEXTJS-1RP: "Cannot read properties of
 * null (reading 'geometry')" (/:locale/word-tower), same destroy-vs-render
 * race class as 1CK/1CW/1PV elsewhere in this engine.
 *
 * Pixi's Ticker._tick has no try/catch around its listener loop — if ANY
 * listener throws (most often Pixi's own auto-registered render call hitting
 * a Graphics/Container a concurrent destroy() just nulled), the exception
 * propagates out of _tick and the ticker never reaches the line that
 * reschedules its own requestAnimationFrame. That freezes the WHOLE engine
 * (every consumer's ticker.add callback) for the rest of the session, not
 * just one dropped frame.
 *
 * GameCanvas now swaps Pixi's raw render listener for a try/catch-wrapped
 * one and wraps its own subsystem-update listener the same way, each logging
 * once per mount via `logger.warn` (not swallowing silently — an empty catch
 * would make 1RP go quiet in Sentry whether or not the render is actually
 * fixed). These tests assert both survive a throw instead of propagating,
 * and that the first throw gets reported.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const loggerMock = vi.hoisted(() => ({ warn: vi.fn() }));
vi.mock('@/utils/logger', () => ({ default: loggerMock }));

const captured = vi.hoisted(() => ({
  tickerListeners: [] as Array<{ fn: (...args: unknown[]) => void; context: unknown; priority: number }>,
  appInstances: [] as Array<{ render: ReturnType<typeof vi.fn> }>,
}));

vi.mock('pixi.js', () => {
  class MockContainer {
    children: MockContainer[] = [];
    destroyed = false;
    sortableChildren = false;
    zIndex = 0;
    position = { x: 0, y: 0 };
    x = 0;
    y = 0;
    addChild(...c: MockContainer[]) { this.children.push(...c); return c[0]; }
    destroy() { this.destroyed = true; }
  }
  class MockGraphics extends MockContainer {
    visible = true;
    clear = vi.fn().mockReturnThis();
    rect = vi.fn().mockReturnThis();
    fill = vi.fn().mockReturnThis();
  }
  class MockParticleContainer extends MockContainer {}
  class MockParticle { constructor(public opts: unknown) {} }
  class MockTicker {
    add(fn: (...args: unknown[]) => void, context: unknown, priority = 0) {
      captured.tickerListeners.push({ fn, context, priority });
      return this;
    }
    remove(fn: (...args: unknown[]) => void, context: unknown) {
      const i = captured.tickerListeners.findIndex((l) => l.fn === fn && l.context === context);
      if (i !== -1) captured.tickerListeners.splice(i, 1);
    }
    stop = vi.fn();
    deltaMS = 16;
  }
  class MockApplication {
    stage = new MockContainer();
    ticker = new MockTicker();
    canvas = document.createElement('canvas');
    renderer = { resize: vi.fn() };
    init = vi.fn().mockResolvedValue(undefined);
    render = vi.fn();
    destroy = vi.fn();
    constructor() { captured.appInstances.push(this as unknown as typeof captured.appInstances[0]); }
  }
  return {
    Application: MockApplication,
    Container: MockContainer,
    Graphics: MockGraphics,
    ParticleContainer: MockParticleContainer,
    Particle: MockParticle,
    UPDATE_PRIORITY: { INTERACTION: 50, HIGH: 25, NORMAL: 0, LOW: -25, UTILITY: -50 },
  };
});

// Force a realistic in-frame subsystem throw (e.g. a Graphics op hitting an
// object a same-frame destroy() just nulled) to prove the update listener
// survives it, rather than asserting on a scenario where nothing throws.
vi.mock('../ParticleSystem', () => ({
  ParticlePool: class {
    update() { throw new Error('post-destroy particle update race'); }
    destroy() { /* */ }
  },
}));

import { GameCanvas } from '../GameCanvas';

beforeEach(() => {
  captured.tickerListeners.length = 0;
  captured.appInstances.length = 0;
  loggerMock.warn.mockClear();
});

const baseConfig = { width: 300, height: 300, background: 0x000000 };

describe('GameCanvas — ticker survives a mid-frame throw (Sentry 1RP)', () => {
  it('registers its own render call wrapped, not Pixi\'s raw app.render, on the ticker', async () => {
    render(<GameCanvas config={baseConfig} />);
    await waitFor(() => expect(captured.appInstances.length).toBe(1));
    await waitFor(() => expect(captured.tickerListeners.some((l) => l.priority === -25)).toBe(true));

    const renderListener = captured.tickerListeners.find((l) => l.priority === -25)!;
    // The raw app.render function itself must NOT be directly on the ticker
    // (that's the unguarded listener that used to freeze the engine).
    expect(renderListener.fn).not.toBe(captured.appInstances[0].render);
  });

  it('does not throw when the wrapped render call hits a post-destroy exception', async () => {
    render(<GameCanvas config={baseConfig} />);
    await waitFor(() => expect(captured.appInstances.length).toBe(1));
    await waitFor(() => expect(captured.tickerListeners.some((l) => l.priority === -25)).toBe(true));

    captured.appInstances[0].render.mockImplementation(() => {
      throw new Error('Cannot read properties of null (reading \'geometry\')');
    });
    const renderListener = captured.tickerListeners.find((l) => l.priority === -25)!;

    expect(() => renderListener.fn()).not.toThrow();
    expect(loggerMock.warn).toHaveBeenCalledTimes(1);
    // A persistent failure must still report ONCE, not spam a log line every
    // frame for the rest of the session.
    renderListener.fn();
    renderListener.fn();
    expect(loggerMock.warn).toHaveBeenCalledTimes(1);
  });

  it('does not throw when a subsystem update throws mid-frame', async () => {
    render(<GameCanvas config={baseConfig} usePhysics={false} />);
    await waitFor(() => expect(captured.appInstances.length).toBe(1));
    // The subsystem-update listener is the one NOT at LOW priority.
    await waitFor(() => expect(captured.tickerListeners.some((l) => l.priority !== -25)).toBe(true));
    const updateListener = captured.tickerListeners.find((l) => l.priority !== -25)!;

    const badTicker = { deltaMS: 16 };
    expect(() => updateListener.fn(badTicker)).not.toThrow();
    expect(loggerMock.warn).toHaveBeenCalledTimes(1);
  });
});
