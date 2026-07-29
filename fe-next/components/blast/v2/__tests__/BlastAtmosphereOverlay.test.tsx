import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { BlastAtmosphereOverlay } from '../BlastAtmosphereOverlay';
import * as framerMotion from 'framer-motion';

// CSS-only atmosphere (Pixi version retired 2026-05-15). Tests cover:
// presence/positioning, modeColor wiring via CSS custom property, and
// reduced-motion gating of decorative particles.

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof framerMotion>('framer-motion');
  return {
    ...actual,
    useReducedMotion: vi.fn(() => false),
  };
});

describe('BlastAtmosphereOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('renders container with correct test id + positioning classes', () => {
    const { container } = render(<BlastAtmosphereOverlay modeColor="#ec4899" />);
    const el = container.querySelector('[data-testid="blast-atmosphere"]');
    expect(el).toBeInTheDocument();
    expect(el).toHaveClass('absolute');
    expect(el).toHaveClass('inset-0');
    expect(el).toHaveClass('pointer-events-none');
  });

  it('applies z-index 1 so it sits behind board + FX', () => {
    const { container } = render(<BlastAtmosphereOverlay modeColor="#ec4899" />);
    const el = container.querySelector('[data-testid="blast-atmosphere"]') as HTMLElement;
    expect(el.style.zIndex).toBe('1');
  });

  it('forwards modeColor via --mode-color CSS variable', () => {
    const { container } = render(<BlastAtmosphereOverlay modeColor="#00FFFF" />);
    const el = container.querySelector('[data-testid="blast-atmosphere"]') as HTMLElement;
    expect(el.style.getPropertyValue('--mode-color')).toBe('#00FFFF');
  });

  it('renders 5 ambient particles when motion is allowed', () => {
    const { container } = render(<BlastAtmosphereOverlay modeColor="#ec4899" />);
    const particles = container.querySelectorAll('[data-testid="blast-atmosphere"] > span');
    expect(particles.length).toBe(5);
  });

  it('hides particles when prefers-reduced-motion', () => {
    (framerMotion.useReducedMotion as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);
    const { container } = render(<BlastAtmosphereOverlay modeColor="#ec4899" />);
    const particles = container.querySelectorAll('[data-testid="blast-atmosphere"] > span');
    expect(particles.length).toBe(0);
  });

  it('unmounts cleanly without errors', () => {
    const { unmount } = render(<BlastAtmosphereOverlay modeColor="#ec4899" />);
    expect(() => unmount()).not.toThrow();
  });
});
