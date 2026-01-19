'use client';

/**
 * RankingsSection - Display player rankings in landscape mode
 *
 * Shows ranked list of participants with icons and styling.
 */

import React from 'react';
import { Trophy, Medal } from 'lucide-react';
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

function getRankIcon(rank: number): React.ReactNode {
  if (rank === 1) return <Trophy className="text-tier-gold text-xl" />;
  if (rank === 2) return <Medal className="text-slate-500 dark:text-slate-300 text-xl" />;
  if (rank === 3) return <Medal className="text-amber-600 text-xl" />;
  return <span className="text-neo-black/70 dark:text-white/70 font-bold">#{rank}</span>;
}

export function RankingsSection({ participants, maxDisplay = 4, title }: RankingsSectionProps): React.ReactElement {
  return (
    <div className="bg-neo-cream text-neo-black dark:bg-slate-800 dark:text-white border-2 border-neo-black rounded-neo p-2">
      <h3 className="text-xs font-black uppercase text-neo-black/80 dark:text-neo-cream mb-1">
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
