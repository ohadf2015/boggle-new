/**
 * ResultsHeroTilt — content stays flat (no rotateX/scale/opacity-dim) so
 * the podium reads clearly. A tiny GSAP-scrubbed Y lift gives the hero a
 * scroll-coupled beat without warping content. Reduced-motion users must
 * get a plain wrapper.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React, { useRef } from 'react';
import { ResultsHeroTilt } from '../ResultsScrollEffects';

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
    to: vi.fn(() => ({ kill: vi.fn(), scrollTrigger: { kill: vi.fn() } })),
    set: vi.fn(),
    utils: { clamp: (min: number, max: number, v: number) => Math.max(min, Math.min(max, v)) },
  },
}));
vi.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: { kill: vi.fn() } }));

import { useReducedMotion } from 'framer-motion';

function Harness({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  return (
    <div ref={ref}>
      <ResultsHeroTilt scrollRef={ref} className={className}>
        <p>hero content</p>
      </ResultsHeroTilt>
    </div>
  );
}

describe('ResultsHeroTilt', () => {
  it('renders content flat (no rotateX/scale/opacity-dim)', () => {
    const { container, getByText } = render(<Harness className="podium" />);
    expect(getByText('hero content')).toBeTruthy();
    const wrapper = container.querySelector('.podium');
    expect(wrapper).toBeTruthy();
    const style = (wrapper?.getAttribute('style') ?? '').toLowerCase();
    expect(style).not.toContain('rotatex');
    expect(style).not.toContain('perspective');
    expect(style).not.toMatch(/\bscale\b/);
    expect(style).toContain('transform-origin: top center');
  });

  it('falls back to a plain div under reduced motion (no transforms)', () => {
    vi.mocked(useReducedMotion).mockReturnValueOnce(true);
    const { container } = render(<Harness className="podium" />);
    const wrapper = container.querySelector('.podium');
    expect(wrapper).toBeTruthy();
    const style = (wrapper?.getAttribute('style') ?? '').toLowerCase();
    expect(style).not.toContain('transform-origin');
    expect(style).not.toContain('will-change');
  });
});
