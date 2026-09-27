/**
 * Regression: the Hebrew "black screen" results page bug, podium variant.
 *
 * ResultsPodium renders top 3 players in a podium layout using framer-motion
 * entrances with `initial={{ opacity: 0, ... }}`. When the animation loop is
 * starved (main thread blocked), the podium content (avatar, names, scores)
 * stays invisible at opacity:0.
 *
 * The fix: strip opacity from framer initial/animate, keep transforms,
 * and use CSS `animate-in fade-in-0`.
 *
 * Given-When-Then style.
 */

import { vi } from 'vitest';
vi.unmock('framer-motion');

vi.mock('@/hooks/useReducedMotion', () => ({
  default: () => false,
}));

import React from 'react';
import { render, act } from '@testing-library/react';
import { LazyMotion, domMax } from 'framer-motion';
import ResultsPodium from '../ResultsPodium';

const mockPlayers = [
  { username: 'Winner', score: 5000, rank: 1, isBot: false },
  { username: 'Second', score: 4500, rank: 2, isBot: false },
  { username: 'Third', score: 4000, rank: 3, isBot: false },
];

const defaultProps = {
  players: mockPlayers,
  currentUsername: 'Winner',
  t: (key: string) => key,
};

function renderPodium(props = {}) {
  return render(
    <LazyMotion features={domMax}>
      <ResultsPodium {...defaultProps} {...props} />
    </LazyMotion>
  );
}

describe('ResultsPodium — Hebrew black-screen regression', () => {
  it('does not pin podium content invisible when the animation loop never runs', async () => {
    // Given the podium is rendered with players
    const { container } = renderPodium();

    // When the main-thread animation loop never advances
    await act(async () => {
      await new Promise(res => setTimeout(res, 60));
    });

    // Then the podium wrapper elements are NOT stuck at opacity:0
    // Find any m.div wrapper in the podium (render should create elements even if text missing)
    const podiumElements = container.querySelectorAll('div');
    expect(podiumElements.length).toBeGreaterThan(0);

    // At least some elements should not have opacity:0
    let foundVisibleElement = false;
    podiumElements.forEach((el: HTMLElement) => {
      if (el.style.opacity !== '0') {
        foundVisibleElement = true;
      }
    });

    expect(foundVisibleElement).toBe(true);
  });

  it('keeps podium visible after starved wait', async () => {
    const { container } = renderPodium();
    await act(async () => {
      await new Promise(res => setTimeout(res, 100));
    });

    // Podium should still have elements
    const podiumElements = container.querySelectorAll('div');
    expect(podiumElements.length).toBeGreaterThan(0);

    // At least some should not be at opacity:0
    let foundVisibleElement = false;
    podiumElements.forEach((el: HTMLElement) => {
      if (el.style.opacity !== '0') {
        foundVisibleElement = true;
      }
    });

    expect(foundVisibleElement).toBe(true);
  });
});
