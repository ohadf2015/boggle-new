'use client';

/**
 * ScoreDisplay - Compact score and word count display
 *
 * Shows player score and word count in a compact format for landscape mode.
 */

import React from 'react';

interface ScoreDisplayProps {
  score: number;
  wordCount: number;
  scoreLabel: string;
  wordsLabel: string;
}

export function ScoreDisplay({ score, wordCount, scoreLabel, wordsLabel }: ScoreDisplayProps): React.ReactElement {
  return (
    <div className="flex items-center gap-4">
      <div className="bg-tier-gold border-2 border-neo-black rounded-neo px-4 py-2 text-center shadow-hard-sm">
        <div className="text-2xl font-black text-neo-black">{score}</div>
        <div className="text-[10px] sm:text-xs font-bold uppercase text-neo-black/70">{scoreLabel}</div>
      </div>
      <div className="bg-neo-cream border-2 border-neo-black rounded-neo px-3 py-2 text-center">
        <div className="text-lg font-black text-neo-black">{wordCount}</div>
        <div className="text-[10px] sm:text-xs font-bold uppercase text-neo-black/70">{wordsLabel}</div>
      </div>
    </div>
  );
}
