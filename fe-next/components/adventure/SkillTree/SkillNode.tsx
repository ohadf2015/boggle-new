/**
 * SkillNode Component
 *
 * Displays a single skill in the tree with locked/unlocked/available states.
 * Neo-brutalist design with tier-colored borders and hard shadows.
 */

'use client';

import { memo, useCallback } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { SkillNode as SkillNodeType, SkillTreeState } from '@/types/adventure';
import { canUnlockSkill } from '@/utils/skillTreeUtils';

// ==============================================
// TYPES
// ==============================================

export interface SkillNodeProps {
  /** Skill data from catalog */
  skill: SkillNodeType;
  /** Current skill tree state */
  state: SkillTreeState;
  /** Callback when skill is clicked (for unlock attempt) */
  onSkillClick?: (skill: SkillNodeType) => void;
  /** Optional test ID */
  testId?: string;
}

export type SkillStatus = 'locked' | 'available' | 'unlocked';

// ==============================================
// HELPERS
// ==============================================

/** Get status of skill based on state */
export function getSkillStatus(
  skill: SkillNodeType,
  state: SkillTreeState
): SkillStatus {
  if (state.unlockedSkills.has(skill.id)) {
    return 'unlocked';
  }
  if (canUnlockSkill(skill.id, state)) {
    return 'available';
  }
  return 'locked';
}

/** Get tier color classes */
function getTierColors(tier: 1 | 2 | 3): { border: string; bg: string; glow: string } {
  switch (tier) {
    case 1:
      return {
        border: 'border-neo-cyan',
        bg: 'bg-neo-cyan/20',
        glow: 'shadow-[0_0_15px_rgba(0,255,255,0.4)]',
      };
    case 2:
      return {
        border: 'border-neo-orange',
        bg: 'bg-neo-orange/20',
        glow: 'shadow-[0_0_15px_rgba(255,107,53,0.4)]',
      };
    case 3:
      return {
        border: 'border-neo-pink',
        bg: 'bg-neo-pink/20',
        glow: 'shadow-[0_0_15px_rgba(255,20,147,0.4)]',
      };
  }
}

/** Get path accent color */
function getPathAccent(path: 'power' | 'strategy' | 'utility'): string {
  switch (path) {
    case 'power':
      return 'text-red-400';
    case 'strategy':
      return 'text-blue-400';
    case 'utility':
      return 'text-green-400';
  }
}

// ==============================================
// COMPONENT
// ==============================================

export const SkillNode = memo<SkillNodeProps>(
  ({ skill, state, onSkillClick, testId }) => {
    const { t } = useLanguage();
    const status = getSkillStatus(skill, state);
    const tierColors = getTierColors(skill.tier);
    const handleClick = useCallback(() => {
      if (status === 'available' && onSkillClick) {
        onSkillClick(skill);
      }
    }, [status, onSkillClick, skill]);

    const isClickable = status === 'available';
    const isUnlocked = status === 'unlocked';
    const isLocked = status === 'locked';

    return (
      <AdaptiveMotion.button
        data-testid={testId || `skill-node-${skill.id}`}
        data-status={status}
        onClick={handleClick}
        disabled={!isClickable}
        className={cn(
          // Base styles
          'relative w-20 h-20 md:w-24 md:h-24',
          'rounded-xl border-3',
          'flex flex-col items-center justify-center',
          'transition-all duration-200',
          'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',

          // Status-specific styles
          isUnlocked && [
            tierColors.border,
            tierColors.bg,
            tierColors.glow,
          ],
          isClickable && [
            'border-neo-yellow',
            'bg-neo-yellow/20',
            'shadow-hard hover:shadow-hard-lg',
            'hover:-translate-y-1 cursor-pointer',
            'active:translate-y-0.5 active:shadow-hard-pressed',
          ],
          isLocked && [
            'border-neo-white/20',
            'bg-neo-white/5',
            'opacity-50 cursor-not-allowed',
          ]
        )}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        whileHover={isClickable ? { scale: 1.05 } : undefined}
        whileTap={isClickable ? { scale: 0.95 } : undefined}
      >
        {/* Icon */}
        <span className="text-2xl md:text-3xl mb-1" aria-hidden="true">
          {skill.icon}
        </span>

        {/* Skill Name (abbreviated for node) */}
        <span
          className={cn(
            'text-[10px] md:text-xs font-bold text-center leading-tight',
            'line-clamp-2 px-1',
            isUnlocked && 'text-neo-white',
            isClickable && 'text-neo-yellow',
            isLocked && 'text-neo-white'
          )}
        >
          {t(skill.nameKey)}
        </span>

        {/* Cost Badge (only for available skills) */}
        {isClickable && (
          <AdaptiveMotion.span
            className={cn(
              'absolute -bottom-2 -inset-e-2',
              'px-2 py-0.5',
              'bg-neo-yellow text-neo-black',
              'text-xs font-black',
              'border-2 border-neo-black rounded-full',
              'shadow-hard-sm'
            )}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
          >
            {skill.cost}
          </AdaptiveMotion.span>
        )}

        {/* Locked Icon Overlay */}
        {isLocked && (
          <span
            className="absolute top-1 inset-e-1 text-neo-white"
            aria-label={t('adventure.skills.locked')}
          >
            🔒
          </span>
        )}

        {/* Unlocked Checkmark */}
        {isUnlocked && (
          <AdaptiveMotion.span
            className={cn(
              'absolute -top-2 -inset-e-2',
              'w-6 h-6 flex items-center justify-center',
              'bg-green-500 text-white',
              'border-2 border-neo-black rounded-full',
              'text-sm font-bold'
            )}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 500 }}
          >
            ✓
          </AdaptiveMotion.span>
        )}
      </AdaptiveMotion.button>
    );
  }
);

SkillNode.displayName = 'SkillNode';
