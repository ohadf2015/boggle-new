/**
 * Regression: the Hebrew "black screen" results page bug, section-reveal variant.
 *
 * ResultsSectionReveal wraps results page sections in a framer-motion entrance
 * animation. When the animation has `initial={{ opacity: 0, ... }}`, its content
 * only becomes visible once the animation loop (rAF) advances. While the loop is
 * starved — which happens when parsing the large Hebrew translation bundle
 * blocks the main thread — the content stays pinned at opacity:0, so the user
 * sees a black screen where the section should be.
 *
 * This test uses the REAL framer-motion and forces the motion path (not the
 * reduced-motion or native static return) to reproduce the starved-loop condition:
 * jsdom never drives the animation clock, so an `initial: opacity:0` stays at 0.
 *
 * The fix: strip opacity from the framer initial/whileInView, keep the slide
 * transforms, and use CSS `animate-in fade-in-0` instead for visibility.
 *
 * Given-When-Then style.
 */

import { vi } from 'vitest';
// Use the REAL framer-motion so this test reproduces the production bug.
vi.unmock('framer-motion');

// Force ResultsSectionReveal down its real-framer path (NOT native, NOT mobile, NOT reduced).
// Must mock BEFORE importing the component so the module-level isNativeApp/isMobileViewport calls use mocks.
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
}));

import React from 'react';
import { render, act } from '@testing-library/react';
import { LazyMotion, domMax } from 'framer-motion';
import { ResultsSectionReveal } from '../ResultsScrollEffects';

function renderReveal(children = <div data-testid="reveal-child">Content</div>, index = 0) {
  return render(
    <LazyMotion features={domMax}>
      <ResultsSectionReveal index={index}>{children}</ResultsSectionReveal>
    </LazyMotion>
  );
}

describe('ResultsSectionReveal — Hebrew black-screen regression', () => {
  beforeAll(() => {
    // Mock matchMedia to report non-mobile viewport so isMobileViewport() returns false
    global.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(max-width: 768px)' ? false : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it('does not pin content invisible when the animation loop never runs', async () => {
    // Given the section reveal is rendered
    const { queryByTestId, getByTestId } = renderReveal();
    const child = getByTestId('reveal-child');
    const wrapper = child.parentElement as HTMLElement;

    // Verify we're on the motion path, not the static fallback
    const staticFallback = queryByTestId('results-section-reveal-static');
    expect(staticFallback).toBeNull();

    // And we should be on the motion path
    const motionWrapper = queryByTestId('results-section-reveal-motion');
    expect(motionWrapper).toBeTruthy();

    // When the main-thread animation loop never advances (jsdom never drives it)
    await act(async () => {
      await new Promise(res => setTimeout(res, 60));
    });

    // Then the wrapper holding the content is NOT stuck at opacity:0
    expect(wrapper).toBeTruthy();
    expect(wrapper.style.opacity).not.toBe('0');
  });

  it('keeps content visible after animation frame passes', async () => {
    const { getByTestId } = renderReveal();
    await act(async () => {
      await new Promise(res => setTimeout(res, 100));
    });
    const child = getByTestId('reveal-child');
    const wrapper = child.parentElement as HTMLElement;
    expect(wrapper.style.opacity).not.toBe('0');
  });
});
