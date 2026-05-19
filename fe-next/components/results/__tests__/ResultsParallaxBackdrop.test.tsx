/**
 * ResultsParallaxBackdrop — GSAP ScrollTrigger drives two scrubbed layers,
 * desktop adds a velocity-flicker layer. Mobile must drop the flicker
 * layer (paint cost) and use lower intensity. Reduced-motion users must
 * get nothing.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React, { useRef } from 'react';

const { gsapTo, gsapSet } = vi.hoisted(() => ({
  gsapTo: vi.fn(() => ({ kill: vi.fn(), scrollTrigger: { kill: vi.fn() } })),
  gsapSet: vi.fn(),
}));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, style, className, ...props }: React.PropsWithChildren<{ style?: React.CSSProperties; className?: string } & Record<string, unknown>>) => (
      <div className={className} style={style as React.CSSProperties} {...props}>{children}</div>
    ),
  },
  useScroll: () => ({ scrollY: 0, scrollYProgress: 0 }),
  useTransform: () => 0,
  useSpring: (v: unknown) => v,
  useVelocity: () => 0,
  useReducedMotion: vi.fn(() => false),
}));

vi.mock('gsap', () => ({
  default: {
    registerPlugin: vi.fn(),
    to: gsapTo,
    set: gsapSet,
    utils: { clamp: (min: number, max: number, v: number) => Math.max(min, Math.min(max, v)) },
  },
}));
vi.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: { kill: vi.fn() } }));

import { ResultsParallaxBackdrop } from '../ResultsScrollEffects';
import { useReducedMotion } from 'framer-motion';

function Harness() {
  const ref = useRef<HTMLDivElement | null>(null);
  return (
    <div ref={ref} data-testid="scroller">
      <ResultsParallaxBackdrop scrollRef={ref} intensity={120} />
    </div>
  );
}

function setViewport(maxWidth: number) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: q.includes('768px') ? maxWidth <= 768 : false,
    media: q,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe('ResultsParallaxBackdrop', () => {
  beforeEach(() => {
    gsapTo.mockClear();
    gsapSet.mockClear();
  });

  it('mounts 2 scrubbed layers on mobile (no velocity flicker)', () => {
    setViewport(400);
    const { container } = render(<Harness />);
    // back + mid only on mobile — flicker layer omitted from DOM
    const layers = container.querySelectorAll('.absolute.inset-0.will-change-transform');
    expect(layers.length).toBe(2);
  });

  it('mounts 3 layers on desktop (back + mid + velocity flicker)', () => {
    setViewport(1200);
    const { container } = render(<Harness />);
    const layers = container.querySelectorAll('.absolute.inset-0.will-change-transform');
    expect(layers.length).toBe(3);
  });

  it('renders nothing under reduced motion', () => {
    vi.mocked(useReducedMotion).mockReturnValueOnce(true);
    setViewport(1200);
    const { container } = render(<Harness />);
    expect(container.querySelector('.will-change-transform')).toBeNull();
  });
});
