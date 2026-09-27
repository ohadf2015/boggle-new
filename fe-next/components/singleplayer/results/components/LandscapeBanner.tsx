'use client';

/**
 * LandscapeBanner - Victory/completion banner for landscape mode
 *
 * Displays game outcome with appropriate styling and messaging.
 */

import React from 'react';
import { Trophy, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LandscapeBannerProps {
  playerScore: number;
  validWordCount: number;
  isWinner: boolean;
  isNewHighScore: boolean;
  playerRank: number;
  labels: {
    tryAgain: string;
    keepPracticing: string;
    newHighScore: string;
    victory: string;
    gameOver: string;
  };
}

export function LandscapeBanner({
  playerScore,
  validWordCount,
  isWinner,
  isNewHighScore,
  playerRank,
  labels,
}: LandscapeBannerProps): React.ReactElement {
  const hasNoWords = playerScore === 0 || validWordCount === 0;
  const hasMinimalWords = validWordCount <= 2;

  function getMessage(): string {
    if (hasNoWords) return labels.tryAgain;
    if (hasMinimalWords) return labels.keepPracticing;
    if (isNewHighScore) return labels.newHighScore;
    if (isWinner && playerScore > 0) return labels.victory;
    return labels.gameOver;
  }

  function getIcon(): React.ReactNode {
    if (hasNoWords) return <span className="font-black text-neo-black">🎯</span>;
    if (isWinner) return <Trophy className="text-xl text-neo-black" />;
    if (isNewHighScore) return <Crown className="text-xl text-neo-black" />;
    return <span className="font-black text-neo-black">#{playerRank}</span>;
  }

  const backgroundClass = hasNoWords
    ? 'bg-neo-cream dark:bg-neo-navy-elevated'
    : (isWinner || isNewHighScore)
      ? 'bg-linear-to-r from-tier-gold to-yellow-300'
      : 'bg-neo-cream dark:bg-neo-navy-elevated';

  return (
    <div className={cn(
      'w-full text-center py-2 rounded-neo border-2 border-neo-black',
      backgroundClass
    )}>
      <div className="flex items-center justify-center gap-2">
        {getIcon()}
        <span className="font-black text-sm uppercase text-neo-black">
          {getMessage()}
        </span>
      </div>
    </div>
  );
}
