/**
 * BossDefeatFireworks Component
 *
 * Wrapper around NewYearFireworks adapted for boss defeat context.
 * Intensity scales with boss tier (mini/standard/elite).
 */

'use client';

import { memo } from 'react';
import NewYearFireworks from './NewYearFireworks';

// ==============================================
// TYPES
// ==============================================

export type BossTier = 'mini' | 'standard' | 'elite';

export interface BossDefeatFireworksProps {
  /** Whether to show fireworks */
  active: boolean;
  /** Boss tier affects intensity */
  bossTier: BossTier;
}

// ==============================================
// CONSTANTS
// ==============================================

/**
 * Fireworks configuration per boss tier
 *
 * - Mini: Light celebration (6 bursts, 3s)
 * - Standard: Medium celebration (10 bursts, 5s)
 * - Elite: Epic celebration (15 bursts, 8s)
 */
export const BOSS_TIER_CONFIG: Record<BossTier, { count: number; duration: number }> = {
  mini: { count: 6, duration: 3000 },
  standard: { count: 10, duration: 5000 },
  elite: { count: 15, duration: 8000 },
};

// ==============================================
// COMPONENT
// ==============================================

/**
 * Boss defeat fireworks celebration
 *
 * @example
 * ```tsx
 * <BossDefeatFireworks
 *   active={bossDefeated}
 *   bossTier="elite"
 * />
 * ```
 */
export const BossDefeatFireworks = memo(function BossDefeatFireworks({
  active,
  bossTier,
}: BossDefeatFireworksProps) {
  const config = BOSS_TIER_CONFIG[bossTier];

  return (
    <NewYearFireworks
      active={active}
      count={config.count}
      duration={config.duration}
    />
  );
});

BossDefeatFireworks.displayName = 'BossDefeatFireworks';

export default BossDefeatFireworks;
