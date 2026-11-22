import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { LevelUpCelebration } from '../LevelUpCelebration';

const timelineOpts: { onComplete?: () => void }[] = [];

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ isLowEnd: false, prefersReducedMotion: false, enableGlowEffects: false, enableComplexAnimations: false }),
}));
vi.mock('@/lib/pixiFx/SharedFxApp', () => ({ SharedFxApp: { spawnBurst: vi.fn(), isInitialized: () => true } }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));
vi.mock('@/components/ui/CelebrationMascot', () => ({ CelebrationMascotWithEntrance: () => null }));
vi.mock('gsap', () => ({
  default: {
    timeline: (opts: { onComplete?: () => void }) => {
      timelineOpts.push(opts);
      return { to() { return this; }, from() { return this; }, call() { return this; }, kill: vi.fn() };
    },
    context: (fn: () => void) => { fn(); return { revert: vi.fn() }; },
  },
}));

describe('LevelUpCelebration motion', () => {
  beforeEach(() => { timelineOpts.length = 0; vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('paints the fullscreen layer at full opacity with a solid scrim and no blur', async () => {
    const { getByRole } = await act(async () => render(<LevelUpCelebration level={5} show />));
    const dialog = getByRole('dialog');
    expect(dialog.style.opacity).not.toBe('0');
    expect(dialog.innerHTML).not.toContain('backdrop-blur');
    expect(dialog.querySelector('.bg-neo-navy')).not.toBeNull();
  });

  it('does not dismiss from the timeline timer after unmount', async () => {
    const onDismiss = vi.fn();
    const { unmount } = await act(async () => render(<LevelUpCelebration level={5} show onDismiss={onDismiss} autoDismissAfter={4000} />));
    await act(async () => { await Promise.resolve(); });
    act(() => { timelineOpts[0]?.onComplete?.(); });
    unmount();
    act(() => { vi.advanceTimersByTime(10000); });
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
