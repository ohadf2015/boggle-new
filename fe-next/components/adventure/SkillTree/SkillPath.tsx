/**
 * SkillPath Component
 *
 * Displays a single skill path (column) with all its skills organized by tier.
 * Shows path header, connection lines between tiers, and skill nodes.
 */

'use client';

import React, { memo, useMemo } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { SkillNode as SkillNodeType, SkillPath as SkillPathType, SkillTreeState } from '@/types/adventure';
import { getSkillsByPath } from '@/utils/skillTreeUtils';
import { SkillNode } from './SkillNode';

// ==============================================
// TYPES
// ==============================================

export interface SkillPathProps {
  /** Path type */
  path: SkillPathType;
  /** Current skill tree state */
  state: SkillTreeState;
  /** Callback when skill is clicked */
  onSkillClick?: (skill: SkillNodeType) => void;
  /** Optional test ID */
  testId?: string;
}

// ==============================================
// HELPERS
// ==============================================

/** Get path styling */
function getPathStyles(path: SkillPathType): {
  headerBg: string;
  headerText: string;
  icon: string;
  lineBg: string;
} {
  switch (path) {
    case 'power':
      return {
        headerBg: 'bg-red-500/20 border-red-500',
        headerText: 'text-red-400',
        icon: '⚔️',
        lineBg: 'bg-red-500/30',
      };
    case 'strategy':
      return {
        headerBg: 'bg-blue-500/20 border-blue-500',
        headerText: 'text-blue-400',
        icon: '🧠',
        lineBg: 'bg-blue-500/30',
      };
    case 'utility':
      return {
        headerBg: 'bg-green-500/20 border-green-500',
        headerText: 'text-green-400',
        icon: '🔧',
        lineBg: 'bg-green-500/30',
      };
  }
}

/** Group skills by tier */
function groupByTier(skills: SkillNodeType[]): Map<number, SkillNodeType[]> {
  const grouped = new Map<number, SkillNodeType[]>();
  skills.forEach(skill => {
    const tierSkills = grouped.get(skill.tier) || [];
    tierSkills.push(skill);
    grouped.set(skill.tier, tierSkills);
  });
  return grouped;
}

// ==============================================
// COMPONENT
// ==============================================

export const SkillPath = memo<SkillPathProps>(
  ({ path, state, onSkillClick, testId }) => {
    const { t } = useLanguage();
    const styles = getPathStyles(path);

    // Get skills for this path, grouped by tier
    const skillsByTier = useMemo(() => {
      const pathSkills = getSkillsByPath(path);
      return groupByTier(pathSkills);
    }, [path]);

    // Get all tiers in order
    const tiers = Array.from(skillsByTier.keys()).sort();

    return (
      <AdaptiveMotion.div
        data-testid={testId || `skill-path-${path}`}
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Path Header */}
        <div
          className={cn(
            'flex items-center gap-2 px-4 py-2',
            'border-2 rounded-lg',
            styles.headerBg
          )}
        >
          <span className="text-xl" aria-hidden="true">{styles.icon}</span>
          <span className={cn('font-bold text-sm uppercase tracking-wide', styles.headerText)}>
            {t(`adventure.skills.paths.${path}`) || path}
          </span>
        </div>

        {/* Tier Sections with Connection Lines */}
        <div className="relative flex flex-col items-center gap-6">
          {tiers.map((tier, tierIndex) => {
            const tierSkills = skillsByTier.get(tier) || [];
            const isNotLastTier = tierIndex < tiers.length - 1;

            return (
              <div key={tier} className="flex flex-col items-center">
                {/* Tier Label */}
                <div className="text-neo-white text-xs font-bold mb-2 uppercase tracking-wider">
                  Tier {tier}
                </div>

                {/* Skills in this tier */}
                <div className="flex gap-3">
                  {tierSkills.map((skill, skillIndex) => (
                    <SkillNode
                      key={skill.id}
                      skill={skill}
                      state={state}
                      onSkillClick={onSkillClick}
                    />
                  ))}
                </div>

                {/* Connection Line to next tier */}
                {isNotLastTier && (
                  <AdaptiveMotion.div
                    className={cn(
                      'w-1 h-8 mt-2',
                      'rounded-full',
                      styles.lineBg
                    )}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: 0.2 + tierIndex * 0.1 }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </AdaptiveMotion.div>
    );
  }
);

SkillPath.displayName = 'SkillPath';
