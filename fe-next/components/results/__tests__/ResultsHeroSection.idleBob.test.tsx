/**
 * ResultsHeroSection idle-float ("alive") wiring.
 *
 * After the one-shot entrance springs settle the hero froze. A continuous
 * `hero-idle-bob` loop on the avatar's inner circle keeps the focal point
 * breathing — in EVERY scenario (win and lose), since the avatar is always
 * "you". It must drop under reduced-motion and for an eliminated Word Hunt
 * player (no celebration when you're out).
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

vi.mock('framer-motion', () => ({
  m: new Proxy({}, {
    get: () => ({ children }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement('div', {}, children),
  }),
}));
vi.mock('../../Avatar', () => ({ default: () => <div data-testid="avatar" /> }));
vi.mock('@/components/ui/AnimatedCounter', () => ({ AnimatedCounter: () => <span /> }));

const reducedMotionMock = vi.fn(() => false);
vi.mock('@/hooks/useReducedMotion', () => ({ default: () => reducedMotionMock() }));
vi.mock('@/hooks/useEquippedCosmetic', () => ({ useEquippedCosmetic: () => null }));
vi.mock('@/utils/confettiUtils', () => ({ fireFirstWinConfetti: () => vi.fn() }));
vi.mock('@/utils/victoryEffects', () => ({ fireEquippedVictoryEffect: () => undefined }));

import ResultsHeroSection from '../ResultsHeroSection';

const t = (k: string) => k;

function renderHero(props: Record<string, unknown> = {}) {
  return render(
    <ResultsHeroSection rank={1} score={100} username="ada" totalPlayers={4} t={t} {...(props as Record<string, never>)} />,
  );
}

describe('ResultsHeroSection — idle float (alive)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reducedMotionMock.mockReturnValue(false);
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('applies hero-idle-bob to the winner avatar', () => {
    const { container } = renderHero({ rank: 1 });
    expect(container.querySelector('.hero-idle-bob')).not.toBeNull();
  });

  it('keeps the hero alive for non-winners too (rank 2)', () => {
    const { container } = renderHero({ rank: 2 });
    expect(container.querySelector('.hero-idle-bob')).not.toBeNull();
  });

  it('drops the loop under reduced motion', () => {
    reducedMotionMock.mockReturnValue(true);
    const { container } = renderHero({ rank: 1 });
    expect(container.querySelector('.hero-idle-bob')).toBeNull();
  });

  it('does not float an eliminated Word Hunt player', () => {
    const { container } = renderHero({
      rank: 1,
      isWordHunt: true,
      wordHuntStatus: 'eliminated',
    });
    expect(container.querySelector('.hero-idle-bob')).toBeNull();
  });

  it('breathes the score glow for the winner (rank 1)', () => {
    const { container } = renderHero({ rank: 1 });
    expect(container.querySelector('.score-champion-glow')).not.toBeNull();
  });

  it('does NOT glow the score for non-winners (calm losing screen)', () => {
    const { container } = renderHero({ rank: 2 });
    expect(container.querySelector('.score-champion-glow')).toBeNull();
  });

  it('drops the score glow under reduced motion', () => {
    reducedMotionMock.mockReturnValue(true);
    const { container } = renderHero({ rank: 1 });
    expect(container.querySelector('.score-champion-glow')).toBeNull();
  });
});
