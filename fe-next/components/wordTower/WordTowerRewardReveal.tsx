'use client';

import { REWARD_TIER_META, type RewardTier, type RewardSource } from '@/lib/wordTower/towerReward';

export interface RewardRevealPayload {
  coins: number;
  tier: RewardTier;
  source: RewardSource;
  /** Bumps every grant so the chip re-animates even on a repeat tier. */
  key: number;
}

interface Props {
  reward: RewardRevealPayload | null;
  t: (key: string, params?: Record<string, string | number>) => string;
  reducedMotion?: boolean;
}

/**
 * The "you actually got something" beat. When a milestone grants real coins
 * (added to the wallet via coinManager), this chip flashes the amount + a
 * rarity badge so the grant is felt, not silent. Higher tiers get a louder
 * colour so a rare/epic drop reads as special (controlled-rarity dopamine, the
 * non-predatory casual version: every drop pays, the tier only sets how much).
 *
 * Presentation only — the parent owns the coin grant, the dedupe, and the
 * auto-dismiss lifecycle (mirrors the surprise-FX chip).
 */
export function WordTowerRewardReveal({ reward, t, reducedMotion }: Props) {
  if (!reward) return null;
  const meta = REWARD_TIER_META[reward.tier];
  const isBig = reward.tier === 'rare' || reward.tier === 'epic';
  const bg = isBig ? 'bg-neo-yellow' : 'bg-neo-cyan';
  // Louder the rarer: commons read as a quick receipt, rare/epic as an event.
  const amountSize = reward.tier === 'epic' ? 'text-2xl' : reward.tier === 'rare' ? 'text-xl' : 'text-lg';

  // In-flow chip — renders inside the play screen's notice column (the parent
  // owns stacking), so a reward that lands WITH a zone banner reads as one
  // tidy stack instead of two toasts fighting mid-screen.
  return (
    <div
      key={reward.key}
      role="status"
      aria-live="polite"
      className={`pointer-events-none flex w-fit flex-col items-center gap-0.5 rounded-neo border-neo-thick border-black ${bg} px-5 py-2.5 text-center text-black shadow-hard ${
        reducedMotion ? '' : 'animate-neo-pop'
      }`}
    >
      <span className={`flex items-center gap-1.5 font-neo-display ${amountSize} font-extrabold`}>
        <span aria-hidden>{meta.emoji}</span>
        +{reward.coins}
        <span aria-hidden>🪙</span>
      </span>
      <span className="font-neo-body text-[11px] font-bold uppercase tracking-wide opacity-80">
        {t(`wordTower.reward.tier.${meta.key}`)}
      </span>
    </div>
  );
}
