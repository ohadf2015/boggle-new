/**
 * Regression: the Hebrew "black screen" popup bug, Blast brag-card variant.
 *
 * BlastBragCard is a dark navy results card whose whole content was gated by a
 * framer-motion `initial={{ opacity: 0 }}` entrance. On a starved main thread
 * (Hebrew bundle parse blocks rAF) that entrance never advances, so the content
 * stays pinned at opacity:0 — a dark card with nothing visible.
 *
 * Uses REAL framer-motion (the global mock strips `initial`) and forces
 * AdaptiveMotion onto its motion path to reproduce the starved loop: jsdom never
 * drives the animation clock, so `initial: opacity:0` would stick at 0.
 *
 * The fix: opacity is no longer driven by framer (only scale/y are) and the card
 * fades in via CSS `animate-in fade-in-0`, which settles visible even if the JS
 * loop never runs.
 */

import { vi } from 'vitest';
vi.unmock('framer-motion');

// Force AdaptiveMotion down its real-framer path (capable device, motion on).
vi.mock('@/contexts/AccessibilityContext', () => ({
  useShouldReduceMotion: () => false,
}));
vi.mock('@/components/grid/performanceUtils', () => ({
  getPerformanceConfig: () => ({ isLowEnd: false, enableComplexAnimations: true }),
}));

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { LazyMotion, domMax } from 'framer-motion';
import { BlastBragCard } from '../BlastBragCard';

const results = {
  percentile: 80,
  finalScore: 1234,
  bestWord: 'QUARTZ',
  maxCombo: 5,
  wavesCompleted: 3,
} as React.ComponentProps<typeof BlastBragCard>['results'];

function renderCard() {
  return render(
    <LazyMotion features={domMax}>
      <BlastBragCard results={results} t={(k: string) => k} />
    </LazyMotion>
  );
}

describe('BlastBragCard — Hebrew black-screen regression', () => {
  it('does not pin the card invisible when the animation loop never runs', async () => {
    renderCard();
    await act(async () => {
      await new Promise((res) => setTimeout(res, 60));
    });
    const card = screen.getByTestId('blast-brag-card') as HTMLElement;
    expect(card).toBeInTheDocument();
    expect(card.style.opacity).not.toBe('0');
  });
});
