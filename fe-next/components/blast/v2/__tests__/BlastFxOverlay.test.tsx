import { describe, it, expect, beforeEach, vi } from 'vitest';
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
    const { container } = render(
      <BlastFxOverlay chainEventKey={0} chainDepth={0} clearCenters={[]} clearEventKey={0} />,
    );
    const canvas = container.querySelector('[data-testid="blast-fx"]');
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveClass('absolute', 'inset-0', 'pointer-events-none');
  });

  it('applies correct z-index (above board, below HUD/modals)', () => {
    const { container } = render(
      <BlastFxOverlay chainEventKey={0} chainDepth={0} clearCenters={[]} clearEventKey={0} />,
    );
    const canvas = container.querySelector('[data-testid="blast-fx"]') as HTMLCanvasElement;
    expect(canvas).toHaveStyle('zIndex: 30');
  });

  it('mounts then unmounts without throwing — proves v8 init+destroy contract', async () => {
    const { unmount } = render(
      <BlastFxOverlay chainEventKey={0} chainDepth={0} clearCenters={[]} clearEventKey={0} />,
    );
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
    const { unmount } = render(
      <BlastFxOverlay chainEventKey={0} chainDepth={0} clearCenters={[]} clearEventKey={0} />,
    );
    // Unmount synchronously, before dynamic import + init microtask settle.
    // The component's `cancelled` flag must prevent post-unmount destroy crash.
    expect(() => unmount()).not.toThrow();
  });

  describe('chain ovation reactivity', () => {
    it('initial render carries no ovation attribute', () => {
      const { container } = render(
        <BlastFxOverlay chainEventKey={0} chainDepth={0} clearCenters={[]} clearEventKey={0} />,
      );
      const canvas = container.querySelector('[data-testid="blast-fx"]') as HTMLCanvasElement;
      expect(canvas.getAttribute('data-ovation-tier')).toBeNull();
    });

    it('chain depth 3 sets data-ovation-tier="big" on chainEventKey change', () => {
      const { container, rerender } = render(
        <BlastFxOverlay chainEventKey={0} chainDepth={0} clearCenters={[]} clearEventKey={0} />,
      );
      rerender(
        <BlastFxOverlay
          chainEventKey={1}
          chainDepth={3}
          clearCenters={[]}
          clearEventKey={0}
        />,
      );
      const canvas = container.querySelector('[data-testid="blast-fx"]') as HTMLCanvasElement;
      expect(canvas.getAttribute('data-ovation-tier')).toBe('big');
    });

    it('chain depth 5 sets data-ovation-tier="mega"', () => {
      const { container, rerender } = render(
        <BlastFxOverlay chainEventKey={0} chainDepth={0} clearCenters={[]} clearEventKey={0} />,
      );
      rerender(
        <BlastFxOverlay
          chainEventKey={1}
          chainDepth={5}
          clearCenters={[]}
          clearEventKey={0}
        />,
      );
      const canvas = container.querySelector('[data-testid="blast-fx"]') as HTMLCanvasElement;
      expect(canvas.getAttribute('data-ovation-tier')).toBe('mega');
    });

    it('depth 1 (no chain) does not set ovation attribute', () => {
      const { container, rerender } = render(
        <BlastFxOverlay chainEventKey={0} chainDepth={0} clearCenters={[]} clearEventKey={0} />,
      );
      rerender(
        <BlastFxOverlay
          chainEventKey={1}
          chainDepth={1}
          clearCenters={[]}
          clearEventKey={0}
        />,
      );
      const canvas = container.querySelector('[data-testid="blast-fx"]') as HTMLCanvasElement;
      expect(canvas.getAttribute('data-ovation-tier')).toBeNull();
    });

    it('fires onChainOvation callback with tier when chain event arrives', () => {
      const onChainOvation = vi.fn();
      const { rerender } = render(
        <BlastFxOverlay
          chainEventKey={0}
          chainDepth={0}
          clearCenters={[]}
          clearEventKey={0}
          onChainOvation={onChainOvation}
        />,
      );
      expect(onChainOvation).not.toHaveBeenCalled();
      rerender(
        <BlastFxOverlay
          chainEventKey={1}
          chainDepth={3}
          clearCenters={[]}
          clearEventKey={0}
          onChainOvation={onChainOvation}
        />,
      );
      expect(onChainOvation).toHaveBeenCalledWith('big');
    });

    it('does not fire callback for "none" tier (depth 0 or 1)', () => {
      const onChainOvation = vi.fn();
      const { rerender } = render(
        <BlastFxOverlay
          chainEventKey={0}
          chainDepth={0}
          clearCenters={[]}
          clearEventKey={0}
          onChainOvation={onChainOvation}
        />,
      );
      rerender(
        <BlastFxOverlay
          chainEventKey={1}
          chainDepth={1}
          clearCenters={[]}
          clearEventKey={0}
          onChainOvation={onChainOvation}
        />,
      );
      expect(onChainOvation).not.toHaveBeenCalled();
    });
  });
});
