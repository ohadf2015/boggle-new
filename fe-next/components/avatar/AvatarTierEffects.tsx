import { memo } from 'react';
import { type CustomAvatarConfig, isEpicPart, isLegendaryPart, isPremiumPart } from '@/shared/types/customAvatar';
import '@/styles/avatar-tier-animations.css';

type Tier = 'free' | 'vip' | 'epic' | 'legendary';

/** Determine the highest tier across all equipped parts */
function getAvatarTier(config: CustomAvatarConfig): Tier {
  const parts: [string, string][] = [
    ['eyes', config.eyes],
    ['mouth', config.mouth],
    ['accessory', config.accessory],
    ['hair', config.hair],
    ['base', config.base],
    ['eyebrows', config.eyebrows ?? 'none'],
    ['facialHair', config.facialHair ?? 'none'],
  ];

  let hasEpic = false;
  let hasVip = false;
  for (const [cat, val] of parts) {
    if (val === 'none') continue;
    if (isLegendaryPart(cat, val)) return 'legendary';
    if (isEpicPart(cat, val)) hasEpic = true;
    else if (isPremiumPart(cat, val)) hasVip = true;
  }
  if (hasEpic) return 'epic';
  if (hasVip) return 'vip';
  return 'free';
}

const TIER_CLASS: Record<Tier, string> = {
  free: '',
  vip: 'avatar-tier-vip',
  epic: 'avatar-tier-epic',
  legendary: 'avatar-tier-legendary',
};

const SPARKLE_COUNTS: Record<Tier, number> = {
  free: 0,
  vip: 0,
  epic: 6,
  legendary: 8,
};

interface AvatarTierEffectsProps {
  config: CustomAvatarConfig;
  children: React.ReactNode;
  className?: string;
  /** Override auto-detected tier (useful for previews) */
  forceTier?: Tier;
  /** Disable animations (e.g. in builder grid thumbnails) */
  static?: boolean;
}

/**
 * Wraps an avatar with tier-appropriate visual effects.
 * The avatar SVG itself stays pure — effects are CSS-only overlays.
 */
const AvatarTierEffects = memo<AvatarTierEffectsProps>(({
  config,
  children,
  className = '',
  forceTier,
  static: isStatic,
}) => {
  const tier = forceTier ?? getAvatarTier(config);

  if (isStatic) {
    return <>{children}</>;
  }

  if (tier === 'free') {
    // Free tier: idle breathing only — no sparkles or glow
    return (
      <div className={`avatar-idle-breathe ${className}`}>
        {children}
      </div>
    );
  }

  const tierClass = TIER_CLASS[tier];
  const sparkleCount = SPARKLE_COUNTS[tier];

  return (
    <div className={`relative avatar-idle-breathe ${tierClass} ${className}`}>
      {/* Rotating conic-gradient ring (legendary only) */}
      {tier === 'legendary' && <div className="avatar-ring" />}

      {/* The actual avatar */}
      {children}

      {/* Shimmer sweep overlay */}
      <div className="avatar-shimmer-overlay" />

      {/* Sparkle particles */}
      {sparkleCount > 0 && (
        Array.from({ length: sparkleCount }, (_, i) => (
          <div key={`sparkle-${i}`} className="avatar-sparkle" />
        ))
      )}
    </div>
  );
});

AvatarTierEffects.displayName = 'AvatarTierEffects';

export { getAvatarTier };
export type { Tier };
export default AvatarTierEffects;
