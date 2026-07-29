/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React, { useRef } from 'react';
import { ResultsScrollProgressRail } from '../ResultsScrollEffects';

// Mock framer-motion so we can assert structural rendering deterministically
// without spinning up the real motion engine + RAF in jsdom.
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, style, className, ...props }: React.PropsWithChildren<{ style?: React.CSSProperties; className?: string } & Record<string, unknown>>) => (
      <div data-testid="rail" className={className} style={style as React.CSSProperties} {...props}>{children}</div>
    ),
  },
  useScroll: () => ({ scrollYProgress: 0 }),
  useSpring: (v: unknown) => v,
  useTransform: () => '0%',
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

function Harness({ hideOnMobile }: { hideOnMobile?: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  return (
    <div ref={ref}>
      <ResultsScrollProgressRail scrollRef={ref} hideOnMobile={hideOnMobile} />
    </div>
  );
}

describe('ResultsScrollProgressRail', () => {
  it('renders a vertical rail pinned to the inline-end edge with neo-brutalist hard shadow', () => {
    const { getByTestId } = render(<Harness />);
    const rail = getByTestId('rail');
    expect(rail).toBeTruthy();
    // RTL-aware edge placement: left in RTL, right in LTR
    expect(rail.className).toContain('rtl:left-1');
    expect(rail.className).toContain('ltr:right-1');
    // Hard-shadow neo styling (no blur)
    const style = rail.getAttribute('style') ?? '';
    expect(style).toContain('box-shadow: 1px 1px 0');
  });

  it('hides below md breakpoint by default (hideOnMobile=true)', () => {
    const { getByTestId } = render(<Harness />);
    const rail = getByTestId('rail');
    expect(rail.className).toContain('hidden');
    expect(rail.className).toContain('md:block');
  });

  it('renders on all viewports when hideOnMobile=false', () => {
    const { getByTestId } = render(<Harness hideOnMobile={false} />);
    const rail = getByTestId('rail');
    expect(rail.className).not.toContain('md:block');
    expect(rail.className).toContain('block');
  });

  it('returns null when prefers-reduced-motion is set', () => {
    vi.mocked(useReducedMotion).mockReturnValueOnce(true);
    const { container } = render(<Harness />);
    expect(container.querySelector('[data-testid="rail"]')).toBeNull();
  });
});
