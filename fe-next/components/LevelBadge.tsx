import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

/**
 * Level tier type
 */
type LevelTier = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

/**
 * Tier configuration
 */
interface TierConfig {
  minLevel: number;
  gradient: string;
  border: string;
  shadow: string;
  glow: string;
}

/**
 * Size type
 */
type BadgeSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Size configuration
 */
interface SizeConfig {
  container: string;
  text: string;
  border: string;
}

/**
 * Level tier configurations for visual styling
 */
const LEVEL_TIERS: Record<LevelTier, TierConfig> = {
  COMMON: {
    minLevel: 1,
    gradient: 'from-cyan-400 to-blue-500',
    border: 'border-cyan-500',
    shadow: 'shadow-cyan-500/30',
    glow: 'shadow-cyan-400/40',
  },
  UNCOMMON: {
    minLevel: 10,
    gradient: 'from-blue-400 to-purple-500',
    border: 'border-blue-500',
    shadow: 'shadow-blue-500/30',
    glow: 'shadow-blue-400/40',
  },
  RARE: {
    minLevel: 25,
    gradient: 'from-purple-400 to-pink-500',
    border: 'border-purple-500',
    shadow: 'shadow-purple-500/30',
    glow: 'shadow-purple-400/40',
  },
  EPIC: {
    minLevel: 50,
    gradient: 'from-yellow-400 to-orange-500',
    border: 'border-yellow-500',
    shadow: 'shadow-yellow-500/30',
    glow: 'shadow-yellow-400/40',
  },
  LEGENDARY: {
    minLevel: 75,
    gradient: 'from-pink-400 to-rose-500',
    border: 'border-pink-500',
    shadow: 'shadow-pink-500/30',
    glow: 'shadow-pink-400/40',
  },
};

/**
 * Get the tier configuration for a given level
 */
function getTierForLevel(level: number): TierConfig {
  if (level >= 75) return LEVEL_TIERS.LEGENDARY;
  if (level >= 50) return LEVEL_TIERS.EPIC;
  if (level >= 25) return LEVEL_TIERS.RARE;
  if (level >= 10) return LEVEL_TIERS.UNCOMMON;
  return LEVEL_TIERS.COMMON;
}

/**
 * Size configurations
 */
const SIZES: Record<BadgeSize, SizeConfig> = {
  sm: {
    container: 'w-6 h-6',
    text: 'text-[10px]',
    border: 'border-2',
  },
  md: {
    container: 'w-8 h-8',
    text: 'text-xs',
    border: 'border-2',
  },
  lg: {
    container: 'w-10 h-10',
    text: 'text-sm',
    border: 'border-3',
  },
  xl: {
    container: 'w-14 h-14',
    text: 'text-lg',
    border: 'border-3',
  },
};

/**
 * LevelBadge Props
 */
interface LevelBadgeProps {
  level?: number;
  size?: BadgeSize;
  showLabel?: boolean;
  animate?: boolean;
  className?: string;
}

/**
 * Neo-Brutalist Level Badge Component
 * Displays player level with tier-based styling
 */
const LevelBadge = memo<LevelBadgeProps>(({
  level = 1,
  size = 'md',
  showLabel = false,
  animate = true,
  className,
}) => {
  const tier = useMemo(() => getTierForLevel(level), [level]);
  const sizeConfig = SIZES[size] || SIZES.md;

  const badge = (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-full',
        'font-black text-white',
        'bg-gradient-to-br',
        tier.gradient,
        sizeConfig.container,
        sizeConfig.border,
        'border-neo-black',
        'shadow-hard-sm',
        'transition-transform duration-150',
        'hover:scale-110 hover:shadow-hard',
        className
      )}
      title={`Level ${level}`}
    >
      {/* Level number */}
      <span className={cn(sizeConfig.text, 'drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]')}>
        {level}
      </span>

      {/* Glow effect for high levels */}
      {level >= 25 && (
        <div
          className={cn(
            'absolute inset-0 rounded-full blur-sm opacity-50 -z-10',
            'bg-gradient-to-br',
            tier.gradient
          )}
        />
      )}
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="inline-flex items-center gap-1"
      >
        {badge}
        {showLabel && (
          <span className="text-xs font-bold text-neo-black/60 dark:text-neo-cream/60 uppercase">
            Lvl {level}
          </span>
        )}
      </motion.div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      {badge}
      {showLabel && (
        <span className="text-xs font-bold text-neo-black/60 dark:text-neo-cream/60 uppercase">
          Lvl {level}
        </span>
      )}
    </div>
  );
});

LevelBadge.displayName = 'LevelBadge';

export default LevelBadge;
