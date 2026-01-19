'use client';

/**
 * PerformanceSection - Display performance insights
 *
 * Shows player performance details with insights component.
 */

import React from 'react';
import { BarChart3 } from 'lucide-react';
import PlayerInsights from '@/components/results/PlayerInsights';
import type { PlayerInsights as PlayerInsightsType } from '@/utils/gameInsights';

interface PerformanceSectionProps {
  insights: PlayerInsightsType;
  title: string;
}

export function PerformanceSection({ insights, title }: PerformanceSectionProps): React.ReactElement {
  return (
    <div className="bg-neo-navy border-3 border-neo-black rounded-neo p-3 shadow-hard">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="w-4 h-4 text-neo-cyan" />
        <h3 className="text-sm font-black uppercase text-white">{title}</h3>
      </div>
      <PlayerInsights insights={insights} />
    </div>
  );
}
