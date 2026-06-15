/**
 * ResultsParallaxBackdrop — GSAP ScrollTrigger drives two scrubbed layers
 * (back + mid) on DESKTOP web only. They are dropped on mobile viewports: the
 * freshly-promoted `will-change`/`translate3d` layers paint an uninitialised
 * white backing for a frame on mobile renderers (the post-fanfare "flashing
 * white" regression). The white "velocity-flicker" layer was removed earlier
 * (it too read as the page flashing white). Reduced-motion users get nothing.
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

  it('renders NOTHING on mobile — promoted GPU layers flash white on mobile renderers (post-fanfare white-flash regression)', () => {
    setViewport(400);
    const { container } = render(<Harness />);
    const layers = container.querySelectorAll('.absolute.inset-0.will-change-transform');
    expect(layers.length).toBe(0);
    expect(container.innerHTML).not.toMatch(/will-change|translate3d/i);
  });

  it('mounts 2 scrubbed layers on desktop (back + mid — velocity flicker removed)', () => {
    setViewport(1200);
    const { container } = render(<Harness />);
    // white velocity-flicker layer was deleted (read as page "flashing white"); back + mid only
    const layers = container.querySelectorAll('.absolute.inset-0.will-change-transform');
    expect(layers.length).toBe(2);
  });

  it('renders nothing under reduced motion', () => {
    vi.mocked(useReducedMotion).mockReturnValueOnce(true);
    setViewport(1200);
    const { container } = render(<Harness />);
    expect(container.querySelector('.will-change-transform')).toBeNull();
  });
});
