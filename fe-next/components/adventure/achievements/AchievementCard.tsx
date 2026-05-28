/**
 * AchievementCard Component
 *
 * Displays a single achievement with its status and tier.
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { TIER_COLORS, TIER_ICONS, type TierName } from '@/utils/achievementTiers';
import type { AdventureAchievementDef } from '@/utils/adventureAchievementUtils';

// ==============================================
// TYPES
// ==============================================

interface AchievementCardProps {
  /** Achievement definition */
  achievement: AdventureAchievementDef;
  /** Number of times earned */
  count: number;
  /** Current tier (null if not earned) */
  tier: TierName | null;
  /** Whether achievement is hidden (not yet earned, secret) */
  isHidden?: boolean;
  /** Click handler */
  onClick?: () => void;
}

// ==============================================
// COMPONENT
// ==============================================

export function AchievementCard({
  achievement,
  count,
  tier,
  isHidden,
  onClick,
}: AchievementCardProps) {
  const { t } = useLanguage();
  const isEarned = count > 0;
  const tierColors = tier ? TIER_COLORS[tier] : null;

  return (
    <button
      onClick={onClick}
      disabled={!isEarned}
      className={cn(
        'relative p-4 rounded-neo',
        'border-3 transition-all duration-200',
        'flex flex-col items-center gap-2',
        'text-center',
        isEarned && tierColors && [
          'border-neo-black shadow-hard',
          'hover:shadow-hard-lg hover:-translate-y-0.5',
          'active:translate-y-0.5 active:shadow-hard-pressed',
        ],
        !isEarned && [
          'bg-neo-black/30 border-neo-white/20',
          'opacity-60 cursor-not-allowed',
        ]
      )}
      style={
        isEarned && tierColors
          ? {
              backgroundColor: tierColors.bg,
              borderColor: tierColors.border,
            }
          : undefined
      }
      data-testid={`achievement-card-${achievement.id}`}
    >
      {/* Icon */}
      <span
        className={cn(
          'text-3xl',
          isHidden && 'blur-xs',
          !isEarned && 'grayscale opacity-50'
        )}
      >
        {isHidden ? '❓' : achievement.icon}
      </span>

      {/* Name */}
      <span
        className={cn(
          'text-xs font-bold',
          isEarned && tierColors ? '' : 'text-neo-white'
        )}
        style={isEarned && tierColors ? { color: tierColors.text } : undefined}
      >
        {isHidden ? t('adventure.achievements.hidden') : t(achievement.nameKey)}
      </span>

      {/* Tier Badge */}
      {tier && (
        <span
          className={cn(
            'absolute -top-2 -inset-e-2',
            'w-6 h-6 rounded-full',
            'flex items-center justify-center',
            'border-2 border-neo-black',
            'text-sm'
          )}
          style={{ backgroundColor: tierColors?.bg }}
        >
          {TIER_ICONS[tier]}
        </span>
      )}

      {/* Count Badge (for repeatable achievements) */}
      {!achievement.oneTime && count > 1 && (
        <span
          className={cn(
            'absolute -bottom-2 -inset-e-2',
            'px-1.5 py-0.5 rounded-full',
            'text-[10px] font-bold',
            'bg-neo-black border border-neo-white/30',
            'text-neo-white'
          )}
        >
          x{count}
        </span>
      )}
    </button>
  );
}

export default AchievementCard;
