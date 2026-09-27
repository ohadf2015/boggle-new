'use client';

/**
 * RankingsSection - Display player rankings in landscape mode
 *
 * Shows ranked list of participants with icons and styling.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { getRankBgColor } from '@/utils/rankingStyles';

interface Participant {
  name: string;
  score: number;
  isPlayer: boolean;
}

interface RankingsSectionProps {
  participants: Participant[];
  maxDisplay?: number;
  title: string;
}

const RANK_COLORS = [
  'bg-amber-400 text-neo-black border-amber-600',   // 1st - gold
  'bg-slate-300 text-neo-black border-slate-500',    // 2nd - silver
  'bg-orange-300 text-neo-black border-orange-500',  // 3rd - bronze
];

function getRankIcon(rank: number): React.ReactNode {
  if (rank <= 3) {
    return (
      <span className={cn(
        'inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black border-2',
        RANK_COLORS[rank - 1],
      )}>
        {rank}
      </span>
    );
  }
  return <span className="text-neo-black/70 dark:text-white font-bold">#{rank}</span>;
}

export function RankingsSection({ participants, maxDisplay = 4, title }: RankingsSectionProps): React.ReactElement {
  return (
    <div className="bg-neo-cream text-neo-black dark:bg-neo-navy-light dark:text-white border-2 border-neo-black rounded-neo p-2">
      <h3 className="text-xs font-black uppercase text-neo-black/80 dark:text-neo-white mb-1">
        {title}
      </h3>
      <div className="space-y-1">
        {participants.slice(0, maxDisplay).map((p, i) => (
          <div
            key={p.name}
            className={cn(
              'flex items-center justify-between px-2 py-1 rounded-neo border border-neo-black text-[10px]',
              getRankBgColor(i + 1, p.isPlayer)
            )}
          >
            <span className="flex items-center gap-1">
              {getRankIcon(i + 1)}
              <span className="font-bold">{p.name}</span>
              {p.isPlayer && <span className="text-[9px] sm:text-[10px] opacity-75">(you)</span>}
            </span>
            <span className="font-black">{p.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
