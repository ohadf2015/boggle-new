export const COINS_PER_REFERRAL = 10;

export interface ReferralMilestone {
  id: 'bronze' | 'silver' | 'gold' | 'diamond';
  threshold: number;
  coins: number;
  label: string;
}

export const REFERRAL_MILESTONES: readonly ReferralMilestone[] = [
  { id: 'bronze', threshold: 3, coins: 50, label: 'Bronze Referrer' },
  { id: 'silver', threshold: 10, coins: 200, label: 'Silver Referrer' },
  { id: 'gold', threshold: 25, coins: 500, label: 'Gold Referrer' },
  { id: 'diamond', threshold: 50, coins: 1000, label: 'Diamond Referrer' },
] as const;

/**
 * Returns every milestone whose threshold was crossed when the referrer's
 * count moved from `prevCount` to `newCount`. Handles multi-threshold jumps
 * (e.g. backfills) by returning all crossed tiers in order.
 */
export function milestonesCrossed(
  prevCount: number,
  newCount: number
): ReferralMilestone[] {
  if (newCount <= prevCount) return [];
  return REFERRAL_MILESTONES.filter(
    m => prevCount < m.threshold && newCount >= m.threshold
  );
}
