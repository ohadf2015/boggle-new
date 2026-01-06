/**
 * ScoreBadge Component
 * Compact score badge shown in header - displays solve status, attempts, and streak
 */

'use client';

import React from 'react';
import { Trophy, X } from 'lucide-react';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
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
  targetWord,
  streakDays,
  language,
  onClick,
}) => (
  <div
    className="flex items-center gap-2 cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
    onClick={onClick}
  >
    {solved ? (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500 rounded-neo border-2 border-neo-black">
        <Trophy className="w-4 h-4 text-white" />
        <span className="font-black text-white text-sm">{attemptsUsed}/10</span>
      </div>
    ) : (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-500 rounded-neo border-2 border-neo-black">
        <X className="w-4 h-4 text-white" />
        <span className="font-black text-white text-sm">X/10</span>
      </div>
    )}
    {solved && targetWord && (
      <span className="font-black text-neo-yellow text-sm">
        {language === 'he' ? applyHebrewFinalLetters(targetWord) : targetWord.toUpperCase()}
      </span>
    )}
    {streakDays > 0 && (
      <span className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded font-bold">
        🔥{streakDays}
      </span>
    )}
  </div>
);

export default ScoreBadge;
