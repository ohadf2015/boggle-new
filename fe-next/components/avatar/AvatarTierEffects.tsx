'use client';

import { memo } from 'react';
import { type CustomAvatarConfig } from '@/shared/types/customAvatar';
import { getConfigTier, tierToVisual, type Tier, type VisualTier } from '@/lib/avatar/rarity';

// The rarity scheme lives in lib/avatar/rarity.ts (one scheme for every surface);
// these re-exports keep existing imports working.
export type { Tier, VisualTier };

/** Map the internal economy tier to the player-facing visual tier. */
export function getAvatarVisualTier(config: CustomAvatarConfig): VisualTier {
  return tierToVisual(getAvatarTier(config));
}

/** Determine the highest tier across all equipped parts */
function getAvatarTier(config: CustomAvatarConfig): Tier {
  return getConfigTier(config);
}

interface AvatarTierEffectsProps {
  config: CustomAvatarConfig;
  children: React.ReactNode;
  className?: string;
  /** Override auto-detected tier (useful for previews) */
  forceTier?: Tier;
  /** No wrapper at all (e.g. builder grid thumbnails) */
  static?: boolean;
}

/**
 * Wrapper that tags an avatar with its rarity (`data-avatar-tier`) for
 * surrounding UI. Since the 2026-09 redraw the rarity presentation itself —
 * rays, frame, gems, sparkles, sheen — lives INSIDE the avatar SVG
 * (art/rarityFx), so it also reaches the static PNG and every low-JS surface;
 * this wrapper no longer stacks CSS sparkles on top.
 */
const AvatarTierEffects = memo<AvatarTierEffectsProps>(({ config, children, className = '', forceTier, static: isStatic }) => {
  if (isStatic) return <>{children}</>;
  const tier = forceTier ?? getAvatarTier(config);
  return (
    <div className={className} data-avatar-tier={tierToVisual(tier)}>
      {children}
    </div>
  );
});

AvatarTierEffects.displayName = 'AvatarTierEffects';

export { getAvatarTier };
export default AvatarTierEffects;
