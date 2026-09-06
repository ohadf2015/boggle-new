/**
 * The satisfying end of a rewarded ad.
 *
 * Watching a 30s video is a favour the player does us. Every placement used to
 * end differently — a button flipping to "earned", a modal closing, a timer
 * silently gaining 30s — and some ended with nothing visible at all. This is
 * the single shared payoff every placement gets on reward: a success haptic,
 * a small confetti burst, and (for feature rewards, which have no coin FX of
 * their own) a thank-you toast that names what was just unlocked.
 *
 * Coin rewards deliberately skip the toast: the coin-fly FX and the "+250
 * gold earned!" button state already say it, and a third message is noise.
 */
import type { RewardedSurface } from '@/lib/admob-config';
import { fireConfetti } from '@/utils/confettiUtils';
import { triggerHaptic } from '@/utils/hapticFeedback';
import { neoSuccessToast } from '@/components/NeoToast';

export type RewardKindForCelebration = 'coins' | 'feature';

export interface CelebrateAdRewardParams {
  rewardKind: RewardKindForCelebration;
  /** Coins granted (0 for feature rewards). */
  awarded: number;
  surface: RewardedSurface;
  t: (key: string) => string;
}

const THANKS_KEYS: Record<RewardedSurface, string> = {
  generic: 'ads.thanks.generic',
  hint: 'ads.thanks.hint',
  doubleGold: 'ads.thanks.doubleGold',
  freeze: 'ads.thanks.freeze',
  retry: 'ads.thanks.retry',
  timeLow: 'ads.thanks.timeLow',
  catchup: 'ads.thanks.catchup',
};

export function rewardThanksKey(surface: RewardedSurface): string {
  return THANKS_KEYS[surface] ?? THANKS_KEYS.generic;
}

const TOAST_DURATION_MS = 2800;

export function celebrateAdReward({ rewardKind, surface, t }: CelebrateAdRewardParams): void {
  try {
    triggerHaptic('success');
  } catch {
    /* haptics are best-effort */
  }
  try {
    // Small and quick — a reward, not a victory. fireConfetti already respects
    // reduced-motion and low-end-device flags at its chokepoint.
    fireConfetti({ particleCount: 45, spread: 65, startVelocity: 28, origin: { y: 0.75 } });
  } catch {
    /* no canvas (some WebViews) — the toast below still lands */
  }
  if (rewardKind === 'feature') {
    neoSuccessToast(t(rewardThanksKey(surface)), { icon: '🎁', duration: TOAST_DURATION_MS });
  }
}
