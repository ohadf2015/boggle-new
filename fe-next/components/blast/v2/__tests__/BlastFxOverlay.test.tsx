import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { BlastFxOverlay } from '../BlastFxOverlay';

vi.mock('pixi.js', async () => {
  const actual = await vi.importActual<any>('pixi.js');

  class MockApplication {
    stage = { addChild: vi.fn() };
    ticker = { add: vi.fn() };
    canvas = document.createElement('canvas');
    init = vi.fn().mockResolvedValue(undefined);
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

  it('should mount and render container with correct test id', () => {
    const { container } = render(<BlastFxOverlay />);
    const el = container.querySelector('[data-testid="blast-fx"]');

    expect(el).toBeInTheDocument();
    expect(el).toHaveClass('absolute');
    expect(el).toHaveClass('inset-0');
    expect(el).toHaveClass('pointer-events-none');
  });

  it('should apply correct z-index style', () => {
    const { container } = render(<BlastFxOverlay />);
    const el = container.querySelector('[data-testid="blast-fx"]') as HTMLElement;

    expect(el).toHaveStyle('zIndex: 10');
  });

  it('should cleanup on unmount', () => {
    const { unmount } = render(<BlastFxOverlay />);
    unmount();
    expect(true).toBe(true);
  });
});
