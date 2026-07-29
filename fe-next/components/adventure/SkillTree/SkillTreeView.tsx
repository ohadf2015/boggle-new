/**
 * SkillTreeView — Interactive skill tree using @xyflow/react.
 *
 * Renders 14 skills as graph nodes across 3 paths (power/strategy/utility)
 * with edges representing prerequisites. Replaces the previous static
 * CSS flexbox layout with a pannable, zoomable canvas.
 */

'use client';

import React, { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  type Node,
  type Edge,
  type NodeTypes,
  MarkerType,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSkillTreeStore } from '@/hooks/useSkillTreeStore';
import { SKILL_CATALOG } from '@/utils/skillTreeUtils';
import { SkillFlowNode, type SkillFlowNodeData } from './SkillFlowNode';
import type { SkillNode as SkillNodeType, SkillPath, SkillTreeState } from '@/types/adventure';

// ==============================================
// TYPES
// ==============================================

interface SkillTreeViewProps {
  onSkillUnlock?: (skill: SkillNodeType) => void;
  className?: string;
}

// ==============================================
// LAYOUT CONSTANTS
// ==============================================

/** Column X centers for each path */
const PATH_X: Record<SkillPath, number> = {
  power: 0,
  strategy: 250,
  utility: 500,
};

/** Row Y positions for each tier (tier 1 = bottom, tier 3 = top) */
const TIER_Y: Record<1 | 2 | 3, number> = {
  1: 350,
  2: 200,
  3: 50,
};

/** Horizontal offset when two skills share a tier in the same path */
const TWIN_OFFSET = 70;

// ==============================================
// NODE/EDGE BUILDERS
// ==============================================

/** Build ReactFlow nodes from skill catalog */
function buildNodes(
  state: SkillTreeState,
  onUnlock: (skill: SkillNodeType) => void,
): Node<SkillFlowNodeData>[] {
  // Count how many skills per path+tier so we can offset twins
  const peerMap = new Map<string, SkillNodeType[]>();
  for (const s of SKILL_CATALOG) {
    const key = `${s.path}-${s.tier}`;
    const arr = peerMap.get(key) || [];
    arr.push(s);
    peerMap.set(key, arr);
  }

  return SKILL_CATALOG.map((skill) => {
    const peers = peerMap.get(`${skill.path}-${skill.tier}`) || [];
    const peerIndex = peers.indexOf(skill);
    const peerCount = peers.length;

    // Center single skills, offset twins
    let xOffset = 0;
    if (peerCount === 2) {
      xOffset = peerIndex === 0 ? -TWIN_OFFSET : TWIN_OFFSET;
    }

    return {
      id: skill.id,
      type: 'skillNode',
      position: {
        x: PATH_X[skill.path] + xOffset,
        y: TIER_Y[skill.tier],
      },
      data: { skill, state, onUnlock },
      draggable: false,
      selectable: false,
    };
  });
}

/** Build ReactFlow edges from prerequisite relationships */
function buildEdges(unlockedSkills: Set<string>): Edge[] {
  const edges: Edge[] = [];

  for (const skill of SKILL_CATALOG) {
    for (const prereqId of skill.prerequisites) {
      const bothUnlocked =
        unlockedSkills.has(skill.id) && unlockedSkills.has(prereqId);

      edges.push({
        id: `${prereqId}->${skill.id}`,
        source: prereqId,
        target: skill.id,
        type: 'smoothstep',
        animated: !bothUnlocked,
        style: {
          stroke: bothUnlocked ? '#BFFF00' : 'rgba(255,255,255,0.2)',
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: bothUnlocked ? '#BFFF00' : 'rgba(255,255,255,0.2)',
          width: 14,
          height: 14,
        },
      });
    }
  }

  return edges;
}

// ==============================================
// NODE TYPES
// ==============================================

const nodeTypes: NodeTypes = {
  skillNode: SkillFlowNode,
};

// ==============================================
// INNER COMPONENT (needs ReactFlowProvider above)
// ==============================================

function SkillTreeCanvas({ onSkillUnlock, className }: SkillTreeViewProps) {
  const { t } = useLanguage();
  const availablePoints = useSkillTreeStore((s) => s.availablePoints);
  const unlockedSkills = useSkillTreeStore((s) => s.unlockedSkills);
  const unlockSkill = useSkillTreeStore((s) => s.unlockSkill);

  const handleUnlock = useCallback(
    (skill: SkillNodeType) => {
      const ok = unlockSkill(skill.id, skill.cost);
      if (ok && onSkillUnlock) onSkillUnlock(skill);
    },
    [unlockSkill, onSkillUnlock],
  );

  const treeState: SkillTreeState = useMemo(
    () => ({
      unlockedSkills,
      availablePoints,
      totalPointsEarned: availablePoints,
    }),
    [unlockedSkills, availablePoints],
  );

  const nodes = useMemo(
    () => buildNodes(treeState, handleUnlock),
    [treeState, handleUnlock],
  );

  const edges = useMemo(
    () => buildEdges(unlockedSkills),
    [unlockedSkills],
  );

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {/* Header */}
      <div className="text-center z-10">
        <h2 className="text-2xl font-black text-neo-white mb-2">
          {t('adventure.skills.title')}
        </h2>
        <p className="text-neo-white">
          {t('adventure.skills.points')}:{' '}
          <span className="text-neo-lime font-bold">{availablePoints}</span>
        </p>
      </div>

      {/* ReactFlow Canvas */}
      <div className="w-full h-[500px] rounded-neo border-2 border-neo-white/10 bg-neo-navy-light overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.5}
          maxZoom={1.5}
          panOnDrag
          zoomOnScroll={false}
          zoomOnPinch
          preventScrolling={false}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="rgba(255,255,255,0.03)" gap={20} />
        </ReactFlow>
      </div>

      {/* Path Legend */}
      <div className="flex gap-6 text-xs font-bold">
        <span className="text-neo-red">⚔️ {t('adventure.skills.paths.power')}</span>
        <span className="text-neo-cyan">🧠 {t('adventure.skills.paths.strategy')}</span>
        <span className="text-neo-lime">🔧 {t('adventure.skills.paths.utility')}</span>
      </div>
    </div>
  );
}

// ==============================================
// EXPORTED WRAPPER (provides ReactFlow context)
// ==============================================

export function SkillTreeView(props: SkillTreeViewProps) {
  return (
    <ReactFlowProvider>
      <SkillTreeCanvas {...props} />
    </ReactFlowProvider>
  );
}

export default SkillTreeView;
