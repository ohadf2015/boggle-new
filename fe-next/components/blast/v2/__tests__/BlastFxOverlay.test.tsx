import { describe, it, expect, beforeEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { BlastFxOverlay } from '../BlastFxOverlay';

// No pixi mock — real Pixi v8 runs against jsdom-canvas. The Sentry regression
// (JAVASCRIPT-NEXTJS-15B/D/E: TypeError "_cancelResize is not a function" on
// destroy) only reproduces when the v7-style sync `new Application(opts)` is
// used. With the v8-correct `new Application(); await app.init(opts)` pattern,
// destroy succeeds. So "cleans up without throwing" IS the regression test.

describe('BlastFxOverlay', () => {
  beforeEach(() => {
    cleanup();
  });

  it('mounts canvas with correct testid + neutral classes', () => {
    const { container } = render(<BlastFxOverlay />);
    const canvas = container.querySelector('[data-testid="blast-fx"]');
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveClass('absolute', 'inset-0', 'pointer-events-none');
  });

  it('applies correct z-index', () => {
    const { container } = render(<BlastFxOverlay />);
    const canvas = container.querySelector('[data-testid="blast-fx"]') as HTMLCanvasElement;
    expect(canvas).toHaveStyle('zIndex: 10');
  });

  it('mounts then unmounts without throwing — proves v8 init+destroy contract', async () => {
    const { unmount } = render(<BlastFxOverlay />);
    // Let dynamic import + async init resolve
    await waitFor(() => {
      // Pixi v8 init sets default canvas size 800x600 when no resizeTo
      const canvas = document.querySelector('[data-testid="blast-fx"]') as HTMLCanvasElement;
      expect(canvas.width).toBeGreaterThan(0);
    });
    // Regression guard: v7-style ctor crashes here with "_cancelResize is not a function"
    expect(() => unmount()).not.toThrow();
  });

  it('unmounts before init resolves without throwing — async race safety', () => {
    const { unmount } = render(<BlastFxOverlay />);
    // Unmount synchronously, before dynamic import + init microtask settle.
    // The component's `cancelled` flag must prevent post-unmount destroy crash.
    expect(() => unmount()).not.toThrow();
  });
});
