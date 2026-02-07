'use client';

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { RankBadge } from '@/components/ui/RankBadge';

interface Participant {
  name: string;
  score: number;
  isCurrentPlayer?: boolean;
  isBot?: boolean;
}

interface MobileCompactLeaderboardProps {
  /** Sorted participants (highest score first) */
  participants: Participant[];
  /** Additional className */
  className?: string;
}

/**
 * MobileCompactLeaderboard - Text-only leaderboard for mobile
 *
 * Shows top 3 as simple text rows without avatars or podium.
 * Designed for compact below-the-fold display.
 */
const MobileCompactLeaderboard: React.FC<MobileCompactLeaderboardProps> = memo(({
  participants,
  className,
}) => {
  // Limit to top 3
  const top3 = participants.slice(0, 3);

  if (top3.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      'bg-white/5 rounded-neo border border-white/10 overflow-hidden',
      className
    )}>
      {top3.map((participant, index) => (
        <div
          key={participant.name}
          className={cn(
            'flex items-center justify-between px-3 py-2',
            index < top3.length - 1 && 'border-b border-white/10',
            participant.isCurrentPlayer && 'bg-neo-cyan/10'
          )}
        >
          <div className="flex items-center gap-2">
            <RankBadge rank={index + 1} />
            <span className={cn(
              'font-bold text-sm',
              participant.isCurrentPlayer ? 'text-neo-cyan' : 'text-white'
            )}>
              {participant.name}
            </span>
            {participant.isCurrentPlayer && (
              <span className="text-neo-cyan text-xs">←</span>
            )}
          </div>
          <span className={cn(
            'font-black text-sm',
            participant.isCurrentPlayer ? 'text-neo-cyan' : 'text-white/80'
          )}>
            {participant.score}
          </span>
        </div>
      ))}
    </div>
  );
});

MobileCompactLeaderboard.displayName = 'MobileCompactLeaderboard';

export default MobileCompactLeaderboard;
