/**
 * ResultsHeroSection victory-effect wiring.
 *
 * The MP winner (rank 1) celebration must honor the player's equipped victory
 * effect — and, when nothing premium is equipped, fall back to the SAME
 * `fireFirstWinConfetti` celebration as before (no silent downgrade). Effect is
 * gated on rank===1 and reducedMotion (preserve the existing "when").
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

vi.mock('framer-motion', () => ({
  m: new Proxy({}, {
    get: () => ({ children, ...p }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement('div', {}, children),
  }),
}));
vi.mock('../../Avatar', () => ({ default: () => <div data-testid="avatar" /> }));
vi.mock('@/components/ui/AnimatedCounter', () => ({ AnimatedCounter: () => <span /> }));

const reducedMotionMock = vi.fn(() => false);
vi.mock('@/hooks/useReducedMotion', () => ({ default: () => reducedMotionMock() }));

const equippedMock = vi.fn<[], string | null>(() => null);
vi.mock('@/hooks/useEquippedCosmetic', () => ({
  useEquippedCosmetic: () => equippedMock(),
}));

const fireFirstWinConfettiMock = vi.fn(() => vi.fn());
vi.mock('@/utils/confettiUtils', () => ({
  fireFirstWinConfetti: (...a: unknown[]) => fireFirstWinConfettiMock(...a),
}));

const fireEquippedMock = vi.fn(() => undefined);
vi.mock('@/utils/victoryEffects', () => ({
  fireEquippedVictoryEffect: (...a: unknown[]) => fireEquippedMock(...a),
}));

import ResultsHeroSection from '../ResultsHeroSection';

const t = (k: string) => k;

function renderHero(rank: number) {
  return render(
    <ResultsHeroSection rank={rank} score={100} username="ada" totalPlayers={4} t={t} />,
  );
}

describe('ResultsHeroSection — victory effect wiring', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fireEquippedMock.mockClear();
    fireFirstWinConfettiMock.mockClear();
    equippedMock.mockReturnValue(null);
    reducedMotionMock.mockReturnValue(false);
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('routes the rank-1 win through fireEquippedVictoryEffect with the equipped id + a fallback', () => {
    equippedMock.mockReturnValue('victory-fireworks');
    renderHero(1);
    vi.advanceTimersByTime(900);
    expect(fireEquippedMock).toHaveBeenCalledTimes(1);
    const [rankArg, effectArg, fallbackArg] = fireEquippedMock.mock.calls[0];
    expect(rankArg).toBe(1);
    expect(effectArg).toBe('victory-fireworks');
    expect(typeof fallbackArg).toBe('function');
  });

  it('passes fireFirstWinConfetti as the fallback (no downgrade for the unequipped majority)', () => {
    equippedMock.mockReturnValue(null);
    renderHero(1);
    vi.advanceTimersByTime(900);
    const fallback = fireEquippedMock.mock.calls[0][2] as () => void;
    fallback();
    expect(fireFirstWinConfettiMock).toHaveBeenCalledWith(1200);
  });

  it('does NOT fire for non-winners (rank 2) — preserve the existing "when"', () => {
    renderHero(2);
    vi.advanceTimersByTime(900);
    expect(fireEquippedMock).not.toHaveBeenCalled();
  });

  it('does NOT fire under reduced motion', () => {
    reducedMotionMock.mockReturnValue(true);
    renderHero(1);
    vi.advanceTimersByTime(900);
    expect(fireEquippedMock).not.toHaveBeenCalled();
  });
});
