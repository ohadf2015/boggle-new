/**
 * SkillFlowNode — Custom ReactFlow node for the skill tree.
 *
 * Wraps the skill visual (icon, name, cost badge) in a ReactFlow node
 * with Handles for edge connections. Uses the same neo-brutalist styling
 * as the original SkillNode component.
 */

'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { SkillNode, SkillTreeState } from '@/types/adventure';
import { canUnlockSkill } from '@/utils/skillTreeUtils';

// ==============================================
// TYPES
// ==============================================

export interface SkillFlowNodeData {
  skill: SkillNode;
  state: SkillTreeState;
  onUnlock: (skill: SkillNode) => void;
  [key: string]: unknown;
}

type SkillFlowNodeProps = NodeProps & { data: SkillFlowNodeData };

// ==============================================
// HELPERS
// ==============================================

function getPathColors(path: 'power' | 'strategy' | 'utility') {
  switch (path) {
    case 'power':
      return { border: 'border-neo-red', bg: 'bg-neo-red/20', text: 'text-neo-red', glow: 'shadow-[0_0_15px_rgba(255,51,102,0.4)]' };
    case 'strategy':
      return { border: 'border-neo-cyan', bg: 'bg-neo-cyan/20', text: 'text-neo-cyan', glow: 'shadow-[0_0_15px_rgba(0,255,255,0.4)]' };
    case 'utility':
      return { border: 'border-neo-lime', bg: 'bg-neo-lime/20', text: 'text-neo-lime', glow: 'shadow-[0_0_15px_rgba(191,255,0,0.4)]' };
  }
}

// ==============================================
// COMPONENT
// ==============================================

function SkillFlowNodeComponent({ data }: SkillFlowNodeProps) {
  const { t } = useLanguage();
  const { skill, state, onUnlock } = data;

  const isUnlocked = state.unlockedSkills.has(skill.id);
  const isAvailable = !isUnlocked && canUnlockSkill(skill.id, state);
  const isLocked = !isUnlocked && !isAvailable;
  const colors = getPathColors(skill.path);

  const handleClick = useCallback(() => {
    if (isAvailable) onUnlock(skill);
  }, [isAvailable, onUnlock, skill]);

  return (
    <>
      {/* Top handle — edges from prerequisites connect here */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-transparent !border-0 !w-0 !h-0"
      />

      <button
        onClick={handleClick}
        disabled={!isAvailable}
        data-testid={`skill-node-${skill.id}`}
        className={cn(
          'relative w-24 h-24 rounded-xl border-3',
          'flex flex-col items-center justify-center',
          'transition-all duration-200',
          isUnlocked && [colors.border, colors.bg, colors.glow],
          isAvailable && [
            'border-neo-yellow bg-neo-yellow/20',
            'shadow-hard hover:shadow-hard-lg',
            'hover:-translate-y-1 cursor-pointer',
            'active:translate-y-0.5 active:shadow-hard-pressed',
          ],
          isLocked && [
            'border-neo-white/20 bg-neo-white/5',
            'opacity-50 cursor-not-allowed',
          ],
        )}
      >
        <span className="text-3xl mb-1">{skill.icon}</span>
        <span
          className={cn(
            'text-xs font-bold text-center leading-tight line-clamp-2 px-1',
            isUnlocked && 'text-neo-white',
            isAvailable && 'text-neo-yellow',
            isLocked && 'text-neo-white',
          )}
        >
          {t(skill.nameKey)}
        </span>

        {/* Cost badge */}
        {isAvailable && (
          <span
            className={cn(
              'absolute -bottom-2 -right-2',
              'px-2 py-0.5 bg-neo-yellow text-neo-black',
              'text-xs font-black border-2 border-neo-black rounded-full shadow-hard-sm',
            )}
          >
            {skill.cost}
          </span>
        )}

        {/* Locked overlay */}
        {isLocked && (
          <span className="absolute top-1 right-1 text-neo-white">
            🔒
          </span>
        )}

        {/* Unlocked checkmark */}
        {isUnlocked && (
          <span
            className={cn(
              'absolute -top-2 -right-2',
              'w-6 h-6 flex items-center justify-center',
              'bg-green-500 text-white border-2 border-neo-black rounded-full',
              'text-sm font-bold',
            )}
          >
            ✓
          </span>
        )}
      </button>

      {/* Bottom handle — edges to dependents connect here */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-transparent !border-0 !w-0 !h-0"
      />
    </>
  );
}

export const SkillFlowNode = memo(SkillFlowNodeComponent);
SkillFlowNode.displayName = 'SkillFlowNode';
