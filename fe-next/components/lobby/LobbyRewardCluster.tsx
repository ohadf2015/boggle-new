'use client';

import { cn } from '@/lib/utils';
import { RewardedAdGoldButton } from '@/components/ads/RewardedAdGoldButton';
import { LobbyAvatarRewardButton } from '@/components/avatar/LobbyAvatarRewardButton';

interface Props {
  /** PostHog placement tag, e.g. 'host_waiting' | 'player_waiting'. */
  surface: string;
  /** Coins granted per watched ad (defaults to the lobby standard, 20). */
  goldAmount?: number;
  className?: string;
}

/**
 * MP-lobby reward group. Two tiers, both ad-gated:
 *  - coins (auth-agnostic, repeatable ~10/day) — fills the slot for everyone,
 *    including anonymous guests, so the lobby is never a blank gap;
 *  - daily avatar part (authed-only, premium, 1/day cosmetic).
 * Each child returns null when it has nothing to offer; `empty:hidden` then
 * collapses the whole cluster (mirrors how the old boost button hid).
 */
export function LobbyRewardCluster({ surface, goldAmount = 20, className }: Props) {
  return (
    <div
      data-testid="lobby-reward-cluster"
      className={cn('flex flex-wrap items-center gap-2 empty:hidden', className)}
    >
      <RewardedAdGoldButton goldAmount={goldAmount} surface={surface} quietIdle />
      <LobbyAvatarRewardButton />
    </div>
  );
}

export default LobbyRewardCluster;
