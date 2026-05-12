/**
 * BlastFxBridge — counter-triggered bridge to SharedFxApp (Pixi singleton).
 * Replaces 3x <GameParticles> (tsParticles) render pattern in BlastGame.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

const spawnBurst = vi.fn();

vi.mock('@/lib/pixiFx/SharedFxApp', () => ({
  SharedFxApp: {
    spawnBurst: (...args: unknown[]) => spawnBurst(...args),
  },
}));

const mockDevice = {
  prefersReducedMotion: false,
  enableComplexAnimations: true,
};

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => mockDevice,
}));

import { BlastFxBridge } from '../BlastFxBridge';

beforeEach(() => {
  spawnBurst.mockClear();
  mockDevice.prefersReducedMotion = false;
  mockDevice.enableComplexAnimations = true;
  Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('BlastFxBridge', () => {
  it('renders nothing (null DOM output)', () => {
    const { container } = render(
      <BlastFxBridge wordFoundCounter={0} comboBreakCounter={0} waveClearCounter={0} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('does not spawn on initial render (counters at 0)', () => {
    render(
      <BlastFxBridge wordFoundCounter={0} comboBreakCounter={0} waveClearCounter={0} />,
    );
    expect(spawnBurst).not.toHaveBeenCalled();
  });

  it('spawns word-found preset at screen center when wordFoundCounter increments', () => {
    const { rerender } = render(
      <BlastFxBridge wordFoundCounter={0} comboBreakCounter={0} waveClearCounter={0} />,
    );
    rerender(
      <BlastFxBridge wordFoundCounter={1} comboBreakCounter={0} waveClearCounter={0} />,
    );
    expect(spawnBurst).toHaveBeenCalledTimes(1);
    expect(spawnBurst).toHaveBeenCalledWith('word-found', 500, 400);
  });

  it('spawns combo-break preset at screen center when comboBreakCounter increments', () => {
    const { rerender } = render(
      <BlastFxBridge wordFoundCounter={0} comboBreakCounter={0} waveClearCounter={0} />,
    );
    rerender(
      <BlastFxBridge wordFoundCounter={0} comboBreakCounter={1} waveClearCounter={0} />,
    );
    expect(spawnBurst).toHaveBeenCalledTimes(1);
    expect(spawnBurst).toHaveBeenCalledWith('combo-break', 500, 400);
  });

  it('spawns three staggered victory-burst calls at 20/50/80% width when waveClearCounter increments', () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <BlastFxBridge wordFoundCounter={0} comboBreakCounter={0} waveClearCounter={0} />,
    );
    rerender(
      <BlastFxBridge wordFoundCounter={0} comboBreakCounter={0} waveClearCounter={1} />,
    );

    expect(spawnBurst).toHaveBeenCalledTimes(1);
    expect(spawnBurst).toHaveBeenNthCalledWith(1, 'victory-burst', 200, 400);

    vi.advanceTimersByTime(250);
    expect(spawnBurst).toHaveBeenCalledTimes(2);
    expect(spawnBurst).toHaveBeenNthCalledWith(2, 'victory-burst', 500, 400);

    vi.advanceTimersByTime(250);
    expect(spawnBurst).toHaveBeenCalledTimes(3);
    expect(spawnBurst).toHaveBeenNthCalledWith(3, 'victory-burst', 800, 400);
  });

  it('dedupes identical counter values via ref (no double-fire on unrelated re-render)', () => {
    const { rerender } = render(
      <BlastFxBridge wordFoundCounter={1} comboBreakCounter={0} waveClearCounter={0} />,
    );
    expect(spawnBurst).toHaveBeenCalledTimes(1);

    rerender(
      <BlastFxBridge wordFoundCounter={1} comboBreakCounter={0} waveClearCounter={0} />,
    );
    expect(spawnBurst).toHaveBeenCalledTimes(1);
  });

  it('skips spawn when prefersReducedMotion=true', () => {
    mockDevice.prefersReducedMotion = true;
    const { rerender } = render(
      <BlastFxBridge wordFoundCounter={0} comboBreakCounter={0} waveClearCounter={0} />,
    );
    rerender(
      <BlastFxBridge wordFoundCounter={1} comboBreakCounter={1} waveClearCounter={1} />,
    );
    expect(spawnBurst).not.toHaveBeenCalled();
  });

  it('skips spawn when enableComplexAnimations=false', () => {
    mockDevice.enableComplexAnimations = false;
    const { rerender } = render(
      <BlastFxBridge wordFoundCounter={0} comboBreakCounter={0} waveClearCounter={0} />,
    );
    rerender(
      <BlastFxBridge wordFoundCounter={1} comboBreakCounter={1} waveClearCounter={1} />,
    );
    expect(spawnBurst).not.toHaveBeenCalled();
  });
});
