import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LevelUpCelebration } from '../LevelUpCelebration';

const perf = { isLowEnd: false, prefersReducedMotion: false, enableGlowEffects: false, enableComplexAnimations: false };
vi.mock('@/hooks/useDevicePerformance', () => ({ useDevicePerformance: () => perf }));
vi.mock('@/lib/pixiFx/SharedFxApp', () => ({ SharedFxApp: { spawnBurst: vi.fn(), isInitialized: () => true } }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));
vi.mock('@/components/ui/CelebrationMascot', () => ({ CelebrationMascotWithEntrance: () => null }));
vi.mock('gsap', () => ({
  default: {
    timeline: () => ({ to() { return this; }, from() { return this; }, call() { return this; }, kill: vi.fn() }),
    context: (fn: () => void) => { fn(); return { revert: vi.fn() }; },
  },
}));

describe('LevelUpCelebration action slot', () => {
  beforeEach(() => { perf.prefersReducedMotion = false; });

  it('shows the action in the animated overlay', async () => {
    await act(async () => { render(<LevelUpCelebration level={5} show action={<button>brag</button>} />); });
    expect(screen.getByRole('button', { name: 'brag' })).toBeTruthy();
  });

  it('shows the action in the reduced-motion overlay too', () => {
    perf.prefersReducedMotion = true;
    render(<LevelUpCelebration level={5} show action={<button>brag</button>} />);
    expect(screen.getByRole('button', { name: 'brag' })).toBeTruthy();
  });
});
