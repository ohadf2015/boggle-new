/**
 * SkillTreeView Component
 *
 * Displays the full skill tree with all paths and nodes.
 * Allows users to unlock skills by clicking on available nodes.
 */

'use client';

import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSkillTreeStore } from '@/hooks/useSkillTreeStore';
import { getSkillsByPath, canUnlockSkill } from '@/utils/skillTreeUtils';
import type { SkillNode, SkillPath } from '@/types/adventure';

// ==============================================
// TYPES
// ==============================================

interface SkillTreeViewProps {
  /** Callback when a skill is unlocked */
  onSkillUnlock?: (skill: SkillNode) => void;
  /** Additional CSS classes */
  className?: string;
}

interface SkillNodeComponentProps {
  skill: SkillNode;
  isUnlocked: boolean;
  canUnlock: boolean;
  onUnlock: () => void;
}

// ==============================================
// PATH COLORS
// ==============================================

const PATH_COLORS: Record<SkillPath, { bg: string; border: string; text: string }> = {
  power: {
    bg: 'bg-neo-red/20',
    border: 'border-neo-red',
    text: 'text-neo-red',
  },
  strategy: {
    bg: 'bg-neo-cyan/20',
    border: 'border-neo-cyan',
    text: 'text-neo-cyan',
  },
  utility: {
    bg: 'bg-neo-yellow/20',
    border: 'border-neo-yellow',
    text: 'text-neo-yellow',
  },
};

// ==============================================
// SKILL NODE COMPONENT
// ==============================================

function SkillNodeComponent({
  skill,
  isUnlocked,
  canUnlock,
  onUnlock,
}: SkillNodeComponentProps) {
  const { t } = useLanguage();
  const colors = PATH_COLORS[skill.path];

  return (
    <button
      onClick={canUnlock ? onUnlock : undefined}
      disabled={!canUnlock && !isUnlocked}
      className={cn(
        'relative p-3 rounded-neo',
        'border-3 transition-all duration-200',
        'flex flex-col items-center gap-2',
        'min-w-[100px]',
        isUnlocked && [colors.bg, colors.border, 'shadow-hard'],
        canUnlock && !isUnlocked && [
          'bg-neo-navy border-neo-white/50',
          'hover:border-neo-white hover:shadow-hard',
          'cursor-pointer',
        ],
        !canUnlock && !isUnlocked && [
          'bg-neo-black/30 border-neo-white/20',
          'opacity-50 cursor-not-allowed',
        ]
      )}
      aria-label={t(skill.nameKey)}
      data-testid={`skill-node-${skill.id}`}
    >
      {/* Icon */}
      <span className="text-2xl">{skill.icon}</span>

      {/* Name */}
      <span
        className={cn(
          'text-xs font-bold text-center',
          isUnlocked ? colors.text : 'text-neo-white/70'
        )}
      >
        {t(skill.nameKey)}
      </span>

      {/* Cost Badge */}
      {!isUnlocked && (
        <span
          className={cn(
            'absolute -top-2 -end-2',
            'px-1.5 py-0.5 rounded-full',
            'text-[10px] font-bold',
            'bg-neo-black border border-neo-white/30',
            canUnlock ? 'text-neo-lime' : 'text-neo-white/50'
          )}
        >
          {skill.cost} SP
        </span>
      )}

      {/* Unlocked Checkmark */}
      {isUnlocked && (
        <span
          className={cn(
            'absolute -top-2 -end-2',
            'w-5 h-5 rounded-full',
            'flex items-center justify-center',
            'bg-neo-lime border-2 border-neo-black',
            'text-neo-black text-xs font-bold'
          )}
        >
          ✓
        </span>
      )}
    </button>
  );
}

// ==============================================
// SKILL PATH COMPONENT
// ==============================================

interface SkillPathComponentProps {
  path: SkillPath;
  skills: SkillNode[];
  unlockedSkills: Set<string>;
  availablePoints: number;
  onUnlock: (skill: SkillNode) => void;
}

function SkillPathComponent({
  path,
  skills,
  unlockedSkills,
  availablePoints,
  onUnlock,
}: SkillPathComponentProps) {
  const { t } = useLanguage();
  const colors = PATH_COLORS[path];

  // Group skills by tier
  const tier1 = skills.filter((s) => s.tier === 1);
  const tier2 = skills.filter((s) => s.tier === 2);
  const tier3 = skills.filter((s) => s.tier === 3);

  const pathNames: Record<SkillPath, string> = {
    power: 'adventure.skills.paths.power',
    strategy: 'adventure.skills.paths.strategy',
    utility: 'adventure.skills.paths.utility',
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Path Header */}
      <h3
        className={cn(
          'text-lg font-black uppercase tracking-wide',
          colors.text
        )}
      >
        {t(pathNames[path])}
      </h3>

      {/* Tier 3 */}
      <div className="flex gap-3">
        {tier3.map((skill) => (
          <SkillNodeComponent
            key={skill.id}
            skill={skill}
            isUnlocked={unlockedSkills.has(skill.id)}
            canUnlock={canUnlockSkill(skill.id, { unlockedSkills, availablePoints, totalPointsEarned: availablePoints })}
            onUnlock={() => onUnlock(skill)}
          />
        ))}
      </div>

      {/* Connector Line */}
      <div className={cn('w-0.5 h-6', colors.bg, colors.border)} />

      {/* Tier 2 */}
      <div className="flex gap-3">
        {tier2.map((skill) => (
          <SkillNodeComponent
            key={skill.id}
            skill={skill}
            isUnlocked={unlockedSkills.has(skill.id)}
            canUnlock={canUnlockSkill(skill.id, { unlockedSkills, availablePoints, totalPointsEarned: availablePoints })}
            onUnlock={() => onUnlock(skill)}
          />
        ))}
      </div>

      {/* Connector Line */}
      <div className={cn('w-0.5 h-6', colors.bg, colors.border)} />

      {/* Tier 1 */}
      <div className="flex gap-3">
        {tier1.map((skill) => (
          <SkillNodeComponent
            key={skill.id}
            skill={skill}
            isUnlocked={unlockedSkills.has(skill.id)}
            canUnlock={canUnlockSkill(skill.id, { unlockedSkills, availablePoints, totalPointsEarned: availablePoints })}
            onUnlock={() => onUnlock(skill)}
          />
        ))}
      </div>
    </div>
  );
}

// ==============================================
// MAIN COMPONENT
// ==============================================

export function SkillTreeView({ onSkillUnlock, className }: SkillTreeViewProps) {
  const { t } = useLanguage();

  // Store state and actions
  const availablePoints = useSkillTreeStore((state) => state.availablePoints);
  const unlockedSkills = useSkillTreeStore((state) => state.unlockedSkills);
  const unlockSkill = useSkillTreeStore((state) => state.unlockSkill);

  // Handle skill unlock
  const handleUnlock = useCallback(
    (skill: SkillNode) => {
      const success = unlockSkill(skill.id, skill.cost);
      if (success && onSkillUnlock) {
        onSkillUnlock(skill);
      }
    },
    [unlockSkill, onSkillUnlock]
  );

  // Get skills by path
  const powerSkills = getSkillsByPath('power');
  const strategySkills = getSkillsByPath('strategy');
  const utilitySkills = getSkillsByPath('utility');

  return (
    <div className={cn('flex flex-col items-center gap-8', className)}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-black text-neo-white mb-2">
          {t('adventure.skills.title')}
        </h2>
        <p className="text-neo-white/70">
          {t('adventure.skills.points')}: <span className="text-neo-lime font-bold">{availablePoints}</span>
        </p>
      </div>

      {/* Skill Paths */}
      <div className="flex flex-wrap justify-center gap-8 lg:gap-12">
        <SkillPathComponent
          path="power"
          skills={powerSkills}
          unlockedSkills={unlockedSkills}
          availablePoints={availablePoints}
          onUnlock={handleUnlock}
        />
        <SkillPathComponent
          path="strategy"
          skills={strategySkills}
          unlockedSkills={unlockedSkills}
          availablePoints={availablePoints}
          onUnlock={handleUnlock}
        />
        <SkillPathComponent
          path="utility"
          skills={utilitySkills}
          unlockedSkills={unlockedSkills}
          availablePoints={availablePoints}
          onUnlock={handleUnlock}
        />
      </div>
    </div>
  );
}

export default SkillTreeView;
