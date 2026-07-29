'use client';

/**
 * PerformanceSection - Display performance insights
 *
 * Shows player performance details with insights component.
 * Optionally displays player archetype badge.
 */

import React from 'react';
import { BarChart3 } from 'lucide-react';
import PlayerInsights from '@/components/results/PlayerInsights';
import type { PlayerInsights as PlayerInsightsType } from '@/utils/gameInsights';
import type { PlayerArchetype } from '@/utils/playerArchetypes';

interface PerformanceSectionProps {
  insights: PlayerInsightsType;
  title?: string;
  /** Optional player archetype to display */
  archetype?: PlayerArchetype | null;
}

export function PerformanceSection({ insights, title, archetype }: PerformanceSectionProps): React.ReactElement {
  return (
    <div className="bg-neo-navy border-3 border-neo-black rounded-neo p-3 shadow-hard">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="w-4 h-4 text-neo-cyan" />
        <h3 className="text-sm font-black uppercase text-white">{title}</h3>
      </div>
      <PlayerInsights insights={insights} />
      {archetype && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-lg">{archetype.emoji || '🎯'}</span>
            <div>
              <span className="text-sm font-bold text-neo-lime">{archetype.name}</span>
              {archetype.description && (
                <p className="text-xs text-white">{archetype.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
