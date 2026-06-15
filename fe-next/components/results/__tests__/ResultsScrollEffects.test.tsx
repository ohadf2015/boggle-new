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

// Native detection — flip per-test to assert the GPU-layer scroll effects are
// inert inside the Capacitor WebView (where promoted `will-change`/`translate3d`
// layers paint an uninitialised white backing before they composite).
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => false) },
}));

import { Capacitor } from '@capacitor/core';
import { ResultsParallaxBackdrop, ResultsHeroTilt, ResultsScrollProgressRail } from '../ResultsScrollEffects';

const mockIsNative = vi.mocked(Capacitor.isNativePlatform);

function Harness({ enabled }: { enabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div data-testid="harness" ref={ref}>
      <ResultsParallaxBackdrop scrollRef={ref} enabled={enabled} />
    </div>
  );
}

function TiltHarness({ enabled }: { enabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div data-testid="harness" ref={ref}>
      <ResultsHeroTilt scrollRef={ref} enabled={enabled}>
        <span>child</span>
      </ResultsHeroTilt>
    </div>
  );
}

function RailHarness({ enabled }: { enabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div data-testid="harness" ref={ref}>
      <ResultsScrollProgressRail scrollRef={ref} enabled={enabled} />
    </div>
  );
}

beforeEach(() => {
  mockIsNative.mockReturnValue(false);
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

  it('renders the parallax layer on web (enabled)', () => {
    const { container } = render(<Harness />);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('renders NO GPU layer on native — the promoted layer flashes white in the WebView', () => {
    mockIsNative.mockReturnValue(true);
    const { container } = render(<Harness />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
    // No will-change/translate3d hardware-layer hints leak into the DOM.
    expect(container.innerHTML).not.toMatch(/will-change|translate3d/i);
  });
});

describe('ResultsHeroTilt', () => {
  it('promotes a will-change layer on web', () => {
    const { container } = render(<TiltHarness />);
    expect(container.querySelector('[style*="will-change"]')).not.toBeNull();
  });

  it('renders children with NO will-change layer on native (no white flash)', () => {
    mockIsNative.mockReturnValue(true);
    const { container, getByText } = render(<TiltHarness />);
    expect(getByText('child')).toBeTruthy();
    expect(container.querySelector('[style*="will-change"]')).toBeNull();
  });
});

describe('ResultsScrollProgressRail', () => {
  it('renders the rail on web', () => {
    const { container } = render(<RailHarness />);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('renders nothing on native (no promoted layer to flash white)', () => {
    mockIsNative.mockReturnValue(true);
    const { container } = render(<RailHarness />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });
});
