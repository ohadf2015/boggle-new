// ─── LevelUpCelebration Bridge Tests ─────────────────────────────────
// Sprint 3 port: particle burst moved from inline framer-motion block
// to SharedFxApp.spawnBurst('level-up-burst', x, y). Test covers the
// bridge handoff only — not the full GSAP timeline.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { LevelUpCelebration } from '../LevelUpCelebration';

const spawnBurst = vi.fn();

vi.mock('@/lib/pixiFx/SharedFxApp', () => ({
  SharedFxApp: {
    spawnBurst: (...args: unknown[]) => spawnBurst(...args),
    isInitialized: () => true,
  },
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowEnd: false,
    prefersReducedMotion: false,
    enableGlowEffects: true,
    enableComplexAnimations: true,
  }),
}));

vi.mock('@/utils/confettiUtils', () => ({
  fireConfetti: vi.fn(),
}));

vi.mock('@/components/ui/CelebrationMascot', () => ({
  CelebrationMascotWithEntrance: () => null,
}));

vi.mock('gsap', () => ({
  default: {
    timeline: () => ({
      to: function () { return this; },
      from: function () { return this; },
      call: function () { return this; },
      kill: vi.fn(),
    }),
    context: (fn: () => void) => {
      fn();
      return { revert: vi.fn() };
    },
  },
}));

beforeEach(() => {
  spawnBurst.mockClear();
  cleanup();
});

describe('LevelUpCelebration (bridge)', () => {
  it('does not call spawnBurst when show=false', () => {
    render(<LevelUpCelebration level={5} show={false} />);
    expect(spawnBurst).not.toHaveBeenCalled();
  });

  it('calls SharedFxApp.spawnBurst when show=true and complex animations enabled', async () => {
    await act(async () => {
      render(<LevelUpCelebration level={5} show />);
    });
    expect(spawnBurst).toHaveBeenCalled();
  });

  it('dispatches level-up-burst preset', async () => {
    await act(async () => {
      render(<LevelUpCelebration level={5} show />);
    });
    const call = spawnBurst.mock.calls[0];
    expect(call[0]).toBe('level-up-burst');
  });

  it('passes numeric x/y viewport coords (not strings)', async () => {
    await act(async () => {
      render(<LevelUpCelebration level={5} show />);
    });
    const call = spawnBurst.mock.calls[0];
    expect(typeof call[1]).toBe('number');
    expect(typeof call[2]).toBe('number');
  });

  it('does not render inline framer-motion particle burst divs', async () => {
    const { container } = await act(async () => render(<LevelUpCelebration level={5} show />));
    const burstDivs = container.querySelectorAll('.bg-neo-lime.border-2');
    expect(burstDivs.length).toBe(0);
  });
});
