/**
 * ResultsHeroTilt — the cinematic hero block recedes into 3D as the user
 * scrolls. Reduced-motion users must get a plain wrapper (no transforms).
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
      <div data-testid="hero-tilt" className={className} style={style as React.CSSProperties} {...props}>{children}</div>
    ),
  },
  useScroll: () => ({ scrollY: 0 }),
  useTransform: () => 0,
  useSpring: (v: unknown) => v,
  useVelocity: () => 0,
  useReducedMotion: vi.fn(() => false),
}));

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
  it('wraps content in a transform-perspective container', () => {
    const { getByTestId, getByText } = render(<Harness className="podium" />);
    const tilt = getByTestId('hero-tilt');
    expect(tilt).toBeTruthy();
    expect(getByText('hero content')).toBeTruthy();
    expect(tilt.className).toContain('podium');
    const style = tilt.getAttribute('style') ?? '';
    expect(style.toLowerCase()).toContain('transform-origin: top center');
  });

  it('falls back to a plain div under reduced motion (no transforms)', () => {
    vi.mocked(useReducedMotion).mockReturnValueOnce(true);
    const { container, queryByTestId } = render(<Harness className="podium" />);
    expect(queryByTestId('hero-tilt')).toBeNull();
    expect(container.querySelector('.podium')).toBeTruthy();
  });
});
