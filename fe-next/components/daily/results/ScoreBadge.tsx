/**
 * ScoreBadge Component
 * Compact score badge shown in header - displays solve status, attempts, and streak
 */

'use client';

import React from 'react';
import { Trophy, X } from 'lucide-react';
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
      <div className="flex items-center gap-1.5 px-2 py-1 bg-neo-lime rounded-neo border-2 border-neo-black shadow-hard-sm">
        <Trophy className="w-4 h-4 text-neo-black" />
        <span className="font-black text-neo-black text-sm">{attemptsUsed}/10</span>
      </div>
    ) : (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-neo-gray rounded-neo border-2 border-neo-black shadow-hard-sm">
        <X className="w-4 h-4 text-neo-white" />
        <span className="font-black text-neo-white text-sm">X/10</span>
      </div>
    )}
    {streakDays > 0 && (
      <span className="text-xs bg-neo-orange text-neo-black px-1.5 py-0.5 rounded-neo border border-neo-black font-bold">
        🔥{streakDays}
      </span>
    )}
  </div>
);

export default ScoreBadge;
