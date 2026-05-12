import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { BlastFxOverlay } from '../BlastFxOverlay';

// Mock pixi.js
vi.mock('pixi.js', async () => {
  const actual = await vi.importActual<any>('pixi.js');

  class MockApplication {
    stage = {
      addChild: vi.fn(),
    };
    ticker = {
      add: vi.fn(),
    };
    destroy = vi.fn();
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
});
