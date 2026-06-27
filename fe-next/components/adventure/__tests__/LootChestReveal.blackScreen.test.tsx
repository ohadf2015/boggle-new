/**
 * Regression: the Hebrew "black screen" popup bug, loot-chest variant.
 *
 * LootChestReveal paints an opaque dark backdrop (`fixed inset-0 bg-black/70`)
 * and wraps ALL of its visible content (chest, drops, continue button) in a
 * single entrance wrapper. When that wrapper is a framer-motion element with
 * `initial={{ opacity: 0 }}`, its content only becomes visible once the
 * main-thread animation loop (rAF) advances. While the loop is starved — which
 * happens in Hebrew because parsing the large translation bundle blocks the main
 * thread — the content stays pinned at opacity:0 while the dark backdrop still
 * paints, so the user sees only a black screen.
 *
 * This test uses the REAL framer-motion (the global mock strips `initial`) and
 * forces AdaptiveMotion onto its motion path (capable device, motion enabled) to
 * faithfully reproduce the starved-loop condition: jsdom never drives the
 * animation clock, so an `initial: opacity:0` stays at 0 — the same outcome as a
 * blocked main thread.
 *
 * The fix: the entrance wrapper uses a CSS entrance (`Reveal` / `animate-in`)
 * instead, which runs off the main thread and always settles to the natural,
 * visible resting state.
 *
 * Given-When-Then style.
 */

import { vi } from 'vitest';
// Use the REAL framer-motion so this test reproduces the production bug.
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
import LootChestReveal from '../LootChestReveal';
import { LanguageProvider } from '@/contexts/LanguageContext';
import type { LootDrop } from '@/types/adventure';

const DROPS: LootDrop[] = [
  { type: 'gold', rarity: 'common', quantity: 50 },
];

function renderReveal() {
  return render(
    <LazyMotion features={domMax}>
      <LanguageProvider>
        <LootChestReveal isOpen drops={DROPS} onComplete={vi.fn()} />
      </LanguageProvider>
    </LazyMotion>
  );
}

describe('LootChestReveal — Hebrew black-screen regression', () => {
  it('does not pin the content wrapper invisible when the animation loop never runs', async () => {
    // Given the loot reveal is open over its dark backdrop
    renderReveal();
    // When the main-thread animation loop never advances (jsdom never drives it)
    await act(async () => {
      await new Promise((res) => setTimeout(res, 60));
    });
    // Then the wrapper holding the chest (and all content) is NOT stuck at opacity:0
    const chest = screen.getByTestId('loot-chest');
    const wrapper = chest.parentElement as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.style.opacity).not.toBe('0');
  });

  it('keeps the chest reachable (content actually visible, not just present)', async () => {
    renderReveal();
    await act(async () => {
      await new Promise((res) => setTimeout(res, 60));
    });
    const chest = screen.getByTestId('loot-chest');
    expect(chest).toBeInTheDocument();
    const wrapper = chest.parentElement as HTMLElement;
    expect(wrapper.style.opacity).not.toBe('0');
  });
});
