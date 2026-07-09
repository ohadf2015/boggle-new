/**
 * ScoreBadge Component
 * Compact score badge shown in header - displays solve status, attempts, and streak
 */

'use client';

import React from 'react';
import { Trophy, X } from 'lucide-react';
import { GameBadge } from '@/components/ui/GameBadge';
import type { Language } from '@/types';

export interface ScoreBadgeProps {
  solved: boolean;
  attemptsUsed: number;
  targetWord: string;
  streakDays: number;
  language: Language;
  onClick?: () => void;
}

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({
  solved,
  attemptsUsed,
  targetWord: _targetWord,
  streakDays,
  language: _language,
  onClick,
}) => (
  <div
    className="flex items-center gap-2 cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
    onClick={onClick}
  >
    {solved ? (
      <GameBadge variant="score-success" icon={Trophy} size="lg" animate="pop">
        {attemptsUsed}/10
      </GameBadge>
    ) : (
      <GameBadge variant="score-fail" icon={X} size="lg" animate="pop">
        X/10
      </GameBadge>
    )}
    {streakDays > 0 && (
      <GameBadge
        variant="streak"
        size="sm"
        animate="pop"
        className="text-xs"
        transition={{ type: 'spring', delay: 0.25 }}
      >
        🔥{streakDays}
      </GameBadge>
    )}
  </div>
);

export default ScoreBadge;
