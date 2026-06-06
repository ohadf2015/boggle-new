import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { PartyConfettiBurst } from '../PartyConfettiBurst';

/**
 * PartyConfettiBurst is a decorative PixiJS overlay. We can't meaningfully unit
 * test WebGL output, but we CAN guarantee the two contracts that matter:
 *  - it honours reduced-motion / cosy / low-end by rendering nothing, and
 *  - otherwise it mounts a non-interactive, aria-hidden overlay host.
 */

let mockSkip = false;
vi.mock('@/components/motion/AdaptiveMotion', () => ({
  useSkipAnimations: () => mockSkip,
}));
// Keep the async PixiJS import inert in jsdom (no real WebGL).
vi.mock('pixi.js', () => ({
  Application: class {
    async init() {}
    canvas = document.createElement('canvas');
    stage = { addChild: () => {} };
    ticker = { add: () => {}, remove: () => {} };
    destroy() {}
  },
  Graphics: class { clear() { return this; } poly() { return this; } fill() { return this; } },
}));

describe('PartyConfettiBurst', () => {
  beforeEach(() => { mockSkip = false; });

  it('renders nothing when animations are skipped (reduced-motion / cosy / low-end)', () => {
    mockSkip = true;
    const { container } = render(<PartyConfettiBurst accent="neo-pink" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a non-interactive aria-hidden overlay host otherwise', () => {
    mockSkip = false;
    const { container } = render(<PartyConfettiBurst accent="neo-pink" />);
    const host = container.firstChild as HTMLElement;
    expect(host).not.toBeNull();
    expect(host).toHaveAttribute('aria-hidden', 'true');
    expect(host.className).toContain('pointer-events-none');
  });
});
