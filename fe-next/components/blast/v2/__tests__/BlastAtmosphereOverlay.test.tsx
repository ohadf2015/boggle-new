import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { BlastAtmosphereOverlay } from '../BlastAtmosphereOverlay';
import * as framerMotion from 'framer-motion';

// Flush pending microtasks + a macrotask so the component's async IIFE
// (dynamic import → new Application → await init) can make progress.
const flush = () => new Promise((r) => setTimeout(r, 0));

// Shared mocks so tests can make Pixi's destroy() throw — that is the real
// Sentry regression (JAVASCRIPT-NEXTJS-15B/D/E: "_cancelResize is not a
// function" thrown from ResizePlugin.destroy on double-destroy / destroy race).
// initControl lets a test hold init() pending, then resolve it post-unmount to
// deterministically drive the "cancelled mid-init" teardown path.
const { destroyMock, initControl } = vi.hoisted(() => {
  const initControl = {
    deferred: false,
    resolve: () => {},
    make() {
      if (!this.deferred) return Promise.resolve(undefined);
      return new Promise<void>((res) => {
        this.resolve = res;
      });
    },
  };
  return { destroyMock: vi.fn(), initControl };
});

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof framerMotion>('framer-motion');
  return {
    ...actual,
    useReducedMotion: vi.fn(() => false),
  };
});

vi.mock('pixi.js', async () => {
  const actual = await vi.importActual<any>('pixi.js');

  class MockApplication {
    stage = { addChild: vi.fn() };
    ticker = { add: vi.fn() };
    canvas = document.createElement('canvas');
    init = vi.fn(() => initControl.make());
    destroy = destroyMock;
  }

  class MockGraphics {
    circle = vi.fn().mockReturnThis();
    fill = vi.fn().mockReturnThis();
    filters: any[] = [];
    alpha = 1;
    x = 0;
    y = 0;
  }

  class MockBlurFilter {
    constructor(public opts: unknown) {}
  }

  return {
    ...actual,
    Application: MockApplication,
    Graphics: MockGraphics,
    BlurFilter: MockBlurFilter,
  };
});

describe('BlastAtmosphereOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    destroyMock.mockReset();
    initControl.deferred = false;
    initControl.resolve = () => {};
  });

  it('should mount and render container with correct test id', () => {
    const { container } = render(<BlastAtmosphereOverlay modeColor="#ec4899" />);
    const el = container.querySelector('[data-testid="blast-atmosphere"]');

    expect(el).toBeInTheDocument();
    expect(el).toHaveClass('absolute');
    expect(el).toHaveClass('inset-0');
    expect(el).toHaveClass('pointer-events-none');
  });

  it('should apply correct z-index style', () => {
    const { container } = render(<BlastAtmosphereOverlay modeColor="#ec4899" />);
    const el = container.querySelector('[data-testid="blast-atmosphere"]') as HTMLElement;

    expect(el).toHaveStyle('zIndex: 1');
  });

  it('should handle modeColor prop', () => {
    const { rerender, container } = render(<BlastAtmosphereOverlay modeColor="#ec4899" />);
    expect(container.querySelector('[data-testid="blast-atmosphere"]')).toBeInTheDocument();

    rerender(<BlastAtmosphereOverlay modeColor="#00FFFF" />);
    expect(container.querySelector('[data-testid="blast-atmosphere"]')).toBeInTheDocument();
  });

  it('should cleanup on unmount', () => {
    const { unmount } = render(<BlastAtmosphereOverlay modeColor="#ec4899" />);
    unmount();
    expect(true).toBe(true);
  });

  // Regression: JAVASCRIPT-NEXTJS-15B/15D/15E — Pixi's destroy() can throw
  // ("_cancelResize is not a function") on a double-destroy / destroy-during-init
  // race. The cleanup must swallow it so the blast-error boundary never trips.
  it('does not throw on unmount even when Pixi destroy() throws', async () => {
    initControl.deferred = true;
    destroyMock.mockImplementation(() => {
      throw new TypeError('this._cancelResize is not a function');
    });
    const { unmount } = render(<BlastAtmosphereOverlay modeColor="#ec4899" />);
    // Let the IIFE reach app.init() (pending), then resolve it so appInstance
    // is assigned — the cleanup-path destroy() now has a live app to destroy.
    await flush();
    initControl.resolve();
    await flush();
    expect(() => unmount()).not.toThrow();
  });

  it('does not leak an unhandled rejection on the cancelled-mid-init path', async () => {
    initControl.deferred = true;
    destroyMock.mockImplementation(() => {
      throw new TypeError('this._cancelResize is not a function');
    });
    // The component's teardown runs inside an async IIFE; an uncaught throw
    // there rejects that floating promise — surfaced by Node, not the DOM.
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', onUnhandled);
    try {
      // init() stays pending; unmount flips `cancelled`, then we resolve init so
      // the IIFE resumes into its `if (cancelled)` branch and destroys there.
      const { unmount } = render(<BlastAtmosphereOverlay modeColor="#ec4899" />);
      await flush(); // let the dynamic import + `new Application()` + init() run
      unmount();
      initControl.resolve();
      // Flush generously so the IIFE resumes, hits the destroy, and any
      // resulting promise rejection settles while the listener is still bound.
      await flush();
      await flush();
      await flush();
      expect(unhandled).toHaveLength(0);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });
});
