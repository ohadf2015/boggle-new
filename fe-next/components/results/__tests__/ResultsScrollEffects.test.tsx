import React, { useRef } from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// GSAP/ScrollTrigger can't meaningfully run in jsdom (no layout/scroll). We only
// assert the rendered layers here — no GSAP behaviour.
vi.mock('gsap', () => ({
  default: {
    registerPlugin: vi.fn(),
    to: vi.fn(() => ({ scrollTrigger: { kill: vi.fn() }, kill: vi.fn() })),
    set: vi.fn(),
    utils: { clamp: () => 0 },
  },
}));
vi.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: {} }));

import { ResultsParallaxBackdrop } from '../ResultsScrollEffects';

function Harness({ enabled }: { enabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div data-testid="harness" ref={ref}>
      <ResultsParallaxBackdrop scrollRef={ref} enabled={enabled} />
    </div>
  );
}

beforeEach(() => {
  window.matchMedia = ((q: string) => ({
    matches: false,
    media: q,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false;
    },
  })) as unknown as typeof window.matchMedia;
});

describe('ResultsParallaxBackdrop', () => {
  it('renders NO white velocity-flicker layer (white flashes over components)', () => {
    const { container } = render(<Harness />);
    // The scroll-velocity white layer flashed white over the page on fast scroll.
    expect(container.innerHTML).not.toMatch(/rgba\(255,\s*255,\s*255/i);
  });

  it('runs no effect layers when disabled (the CSS-hidden tree must stay inert)', () => {
    const { container } = render(<Harness enabled={false} />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });
});
