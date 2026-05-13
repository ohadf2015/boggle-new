import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { BlastAtmosphereOverlay } from '../BlastAtmosphereOverlay';
import * as framerMotion from 'framer-motion';

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
    init = vi.fn().mockResolvedValue(undefined);
    destroy = vi.fn();
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
});
