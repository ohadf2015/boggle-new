import { describe, it, expect, vi, beforeEach } from 'vitest';

const { fireConfetti, triggerHaptic, neoSuccessToast } = vi.hoisted(() => ({
  fireConfetti: vi.fn(),
  triggerHaptic: vi.fn(),
  neoSuccessToast: vi.fn(),
}));
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti }));
vi.mock('@/utils/hapticFeedback', () => ({ triggerHaptic }));
vi.mock('@/components/NeoToast', () => ({ neoSuccessToast }));

import { celebrateAdReward, rewardThanksKey } from '../rewardCelebration';

const t = (k: string) => k;

describe('celebrateAdReward — the satisfying end of every rewarded ad', () => {
  beforeEach(() => {
    fireConfetti.mockClear();
    triggerHaptic.mockClear();
    neoSuccessToast.mockClear();
  });

  it('Given a feature reward, When celebrated, Then haptic + a small confetti burst + a thank-you toast fire', () => {
    celebrateAdReward({ rewardKind: 'feature', awarded: 0, surface: 'timeLow', t });
    expect(triggerHaptic).toHaveBeenCalledWith('success');
    expect(fireConfetti).toHaveBeenCalledTimes(1);
    expect(neoSuccessToast).toHaveBeenCalledWith('ads.thanks.timeLow', expect.objectContaining({ duration: expect.any(Number) }));
  });

  it('Given a coin reward, When celebrated, Then haptic + confetti fire but NO toast (the coin FX + button already say "+gold")', () => {
    celebrateAdReward({ rewardKind: 'coins', awarded: 250, surface: 'generic', t });
    expect(triggerHaptic).toHaveBeenCalledWith('success');
    expect(fireConfetti).toHaveBeenCalledTimes(1);
    expect(neoSuccessToast).not.toHaveBeenCalled();
  });

  it('Given each surface, When resolving the thank-you copy, Then a specific key is used with a generic fallback', () => {
    expect(rewardThanksKey('doubleGold')).toBe('ads.thanks.doubleGold');
    expect(rewardThanksKey('retry')).toBe('ads.thanks.retry');
    expect(rewardThanksKey('catchup')).toBe('ads.thanks.catchup');
    expect(rewardThanksKey('hint')).toBe('ads.thanks.hint');
    expect(rewardThanksKey('freeze')).toBe('ads.thanks.freeze');
    expect(rewardThanksKey('generic')).toBe('ads.thanks.generic');
  });

  it('Given confetti throws (canvas missing in a WebView), When celebrated, Then the toast still fires', () => {
    fireConfetti.mockImplementationOnce(() => { throw new Error('no canvas'); });
    expect(() => celebrateAdReward({ rewardKind: 'feature', awarded: 0, surface: 'retry', t })).not.toThrow();
    expect(neoSuccessToast).toHaveBeenCalledTimes(1);
  });
});
