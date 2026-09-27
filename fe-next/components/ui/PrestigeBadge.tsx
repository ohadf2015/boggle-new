import { memo } from 'react';
import { cn } from '../../lib/utils';
import { PRESTIGE_CONFIG, toRoman } from '@/backend/modules/xpManager';

/**
 * Shared gradient palette for prestige tiers (bronze → cosmic).
 * Kept here so every social surface (leaderboards, chat, profile tooltips)
 * renders identical visuals from one source of truth.
 */
export const PRESTIGE_GRADIENTS: Record<number, string> = {
  1: 'from-amber-700 to-amber-500',
  2: 'from-gray-500 to-gray-300',
  3: 'from-yellow-600 to-yellow-400',
  4: 'from-cyan-500 to-cyan-300',
  5: 'from-purple-700 to-pink-500',
};

type BadgeSize = 'xs' | 'sm' | 'md';

interface PrestigeBadgeProps {
  level: number;
  size?: BadgeSize;
  hideLabel?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<BadgeSize, string> = {
  xs: 'text-[9px] px-1 py-0 gap-0.5',
  sm: 'text-xs px-1.5 py-0.5 gap-1',
  md: 'text-sm px-2 py-0.5 gap-1',
};

/**
 * PrestigeBadge — tiny visual flex rendered next to a player's name.
 * Pure visual component: no click handlers, no navigation, no modals.
 * Returns null for level 0 or out-of-range values so callers can drop it
 * inline without pre-checks: `<PrestigeBadge level={player.prestigeLevel ?? 0} />`
 */
const PrestigeBadge = memo<PrestigeBadgeProps>(({
  level,
  size = 'xs',
  hideLabel = false,
  className,
}) => {
  if (level <= 0 || level > PRESTIGE_CONFIG.MAX_PRESTIGE) {
    return null;
  }

  const display = PRESTIGE_CONFIG.DISPLAY[level];
  const gradient = PRESTIGE_GRADIENTS[level];
  if (!display || !gradient) {
    return null;
  }

  const roman = toRoman(level);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md font-black text-white shadow-hard-sm',
        'border border-black/40 leading-none align-middle',
        `bg-linear-to-r ${gradient}`,
        SIZE_CLASSES[size],
        className,
      )}
      aria-label={display.name}
      title={display.name}
    >
      <span aria-hidden="true">{display.icon}</span>
      {!hideLabel && <span>{roman}</span>}
    </span>
  );
});

PrestigeBadge.displayName = 'PrestigeBadge';

export default PrestigeBadge;
