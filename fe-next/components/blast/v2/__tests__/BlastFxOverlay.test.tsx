import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { BlastFxOverlay } from '../BlastFxOverlay';

// Capture PIXI Application constructor args so we can assert config.
const appCtorSpy = vi.fn();

vi.mock('pixi.js', async () => {
  const actual = await vi.importActual<any>('pixi.js');

  class MockApplication {
    stage = { addChild: vi.fn() };
    ticker = { add: vi.fn() };
    destroy = vi.fn();
    renderer = { resize: vi.fn() };
    constructor(opts: unknown) {
      appCtorSpy(opts);
    }
  }

  return {
    ...actual,
    Application: MockApplication,
  };
});

describe('BlastFxOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('should mount and render canvas with correct test id', () => {
    const { container } = render(<BlastFxOverlay />);
    const canvas = container.querySelector('[data-testid="blast-fx"]');

    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveClass('absolute');
    expect(canvas).toHaveClass('inset-0');
    expect(canvas).toHaveClass('pointer-events-none');
  });

  it('should apply correct z-index style', () => {
    const { container } = render(<BlastFxOverlay />);
    const canvas = container.querySelector('[data-testid="blast-fx"]') as HTMLCanvasElement;

    expect(canvas).toHaveStyle('zIndex: 10');
  });

  it('should cleanup on unmount', () => {
    const { unmount } = render(<BlastFxOverlay />);

    unmount();
    // If cleanup completes without error, the component cleaned up properly
    expect(true).toBe(true);
  });

  it('mounts PIXI Application with transparent background (backgroundAlpha:0)', () => {
    appCtorSpy.mockClear();
    render(<BlastFxOverlay />);
    expect(appCtorSpy).toHaveBeenCalled();
    const opts = appCtorSpy.mock.calls[0][0];
    // backgroundAlpha must be 0 — else PIXI paints opaque black over the board
    expect(opts.backgroundAlpha).toBe(0);
  });

  it('does not hard-code 400x600 — sizes to parent via resizeTo', () => {
    appCtorSpy.mockClear();
    render(<BlastFxOverlay />);
    const opts = appCtorSpy.mock.calls[0][0];
    // Either resizeTo provided OR width/height absent so PIXI defaults to canvas attrs
    expect(opts.resizeTo !== undefined || (opts.width === undefined && opts.height === undefined)).toBe(true);
  });
});
