/**
 * Regression: the Hebrew "black screen" results page bug, hero-section variant.
 *
 * ResultsHeroSection wraps the top result card in a framer-motion entrance
 * with `initial={{ opacity: 0 }}`. When the animation loop is starved (main
 * thread blocked by parsing the Hebrew translation bundle), the content stays
 * pinned at opacity:0 while the dark backdrop still paints.
 *
 * The fix: strip opacity from framer and use CSS `animate-in fade-in-0` instead.
 *
 * Given-When-Then style.
 */

import { vi } from 'vitest';
vi.unmock('framer-motion');

vi.mock('@/hooks/useReducedMotion', () => ({
  default: () => false,
}));
vi.mock('@/contexts/AccessibilityContext', () => ({
  useShouldReduceMotion: () => false,
}));
vi.mock('@/components/grid/performanceUtils', () => ({
  getPerformanceConfig: () => ({ isLowEnd: false, enableComplexAnimations: true }),
}));

import React from 'react';
import { render, act, screen } from '@testing-library/react';
import { LazyMotion, domMax } from 'framer-motion';
import ResultsHeroSection from '../ResultsHeroSection';

const defaultProps = {
  rank: 1,
  score: 1250,
  username: 'TestPlayer',
  totalPlayers: 4,
  t: (key: string) => key,
};

function renderHero(props = {}) {
  return render(
    <LazyMotion features={domMax}>
      <ResultsHeroSection {...defaultProps} {...props} />
    </LazyMotion>
  );
}

describe('ResultsHeroSection — Hebrew black-screen regression', () => {
  it('does not pin the hero section invisible when the animation loop never runs', async () => {
    // Given the hero section is rendered
    renderHero();
    const section = screen.getByTestId('results-hero-section') as HTMLElement;

    // When the main-thread animation loop never advances (jsdom never drives it)
    await act(async () => {
      await new Promise(res => setTimeout(res, 60));
    });

    // Then the section wrapper is NOT stuck at opacity:0
    expect(section).toBeTruthy();
    expect(section.style.opacity).not.toBe('0');
  });

  it('keeps hero content visible after starved wait', async () => {
    renderHero();
    await act(async () => {
      await new Promise(res => setTimeout(res, 100));
    });
    const section = screen.getByTestId('results-hero-section') as HTMLElement;
    expect(section.style.opacity).not.toBe('0');
  });

  it('works correctly for both rank 1 and other ranks', async () => {
    // Test rank 2
    renderHero({ rank: 2 });
    let section = screen.getByTestId('results-hero-section') as HTMLElement;

    await act(async () => {
      await new Promise(res => setTimeout(res, 60));
    });

    expect(section.style.opacity).not.toBe('0');
  });
});
