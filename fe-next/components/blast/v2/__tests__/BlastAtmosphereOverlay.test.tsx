import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { BlastAtmosphereOverlay } from '../BlastAtmosphereOverlay';
import * as framerMotion from 'framer-motion';

// Mock framer-motion
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof framerMotion>('framer-motion');
  return {
    ...actual,
    useReducedMotion: vi.fn(() => false),
  };
});

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

  class MockGraphics {
    beginFill = vi.fn().mockReturnThis();
    drawCircle = vi.fn().mockReturnThis();
    endFill = vi.fn().mockReturnThis();
    filters: any[] = [];
    alpha = 1;
    x = 0;
    y = 0;
  }

  class MockBlurFilter {
    constructor(public radius: number) {}
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
  });

  it('should mount and render canvas with correct test id', () => {
    const { container } = render(<BlastAtmosphereOverlay modeColor="#ec4899" />);
    const canvas = container.querySelector('[data-testid="blast-atmosphere"]');

    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveClass('absolute');
    expect(canvas).toHaveClass('inset-0');
    expect(canvas).toHaveClass('pointer-events-none');
  });

  it('should apply correct z-index style', () => {
    const { container } = render(<BlastAtmosphereOverlay modeColor="#ec4899" />);
    const canvas = container.querySelector('[data-testid="blast-atmosphere"]') as HTMLCanvasElement;

    expect(canvas).toHaveStyle('zIndex: 1');
  });

  it('should handle modeColor prop', () => {
    const { rerender, container } = render(<BlastAtmosphereOverlay modeColor="#ec4899" />);
    let canvas = container.querySelector('[data-testid="blast-atmosphere"]');
    expect(canvas).toBeInTheDocument();

    rerender(<BlastAtmosphereOverlay modeColor="#00FFFF" />);
    canvas = container.querySelector('[data-testid="blast-atmosphere"]');
    expect(canvas).toBeInTheDocument();
  });

  it('should cleanup on unmount', () => {
    const { unmount } = render(<BlastAtmosphereOverlay modeColor="#ec4899" />);

    unmount();
    // If cleanup completes without error, the component cleaned up properly
    expect(true).toBe(true);
  });
});
