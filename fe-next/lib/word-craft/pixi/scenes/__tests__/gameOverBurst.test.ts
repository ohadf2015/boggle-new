import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { playGameOverBurst } from '../gameOverBurst';

vi.mock('../scoreConfetti', () => ({
  playScoreConfetti: vi.fn(() => Promise.resolve()),
}));

const ctx = (rm = false) => ({
  app: {} as any,
  eventLayer: {} as any,
  ambientLayer: {} as any,
  coords: {} as any,
  reducedMotion: rm,
});

describe('playGameOverBurst', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('triggers 3 confetti waves and resolves', async () => {
    const promise = playGameOverBurst(ctx());
    await vi.runAllTimersAsync();
    await promise;
    const { playScoreConfetti } = await import('../scoreConfetti');
    expect(playScoreConfetti).toHaveBeenCalledTimes(3);
  });

  it('no-op when reducedMotion=true', async () => {
    const { playScoreConfetti } = await import('../scoreConfetti');
    (playScoreConfetti as any).mockClear();
    await playGameOverBurst(ctx(true));
    expect(playScoreConfetti).not.toHaveBeenCalled();
  });
});
