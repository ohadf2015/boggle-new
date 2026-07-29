'use client';

/**
 * LandscapeWordsSection - Display words found in landscape mode
 *
 * Compact word display with color-coded points.
 */

import React from 'react';
import { getPointColor, getTextColor } from '@/components/results/utils';

interface WordData {
  word: string;
  score: number;
}

interface LandscapeWordsSectionProps {
  wordsByPoints: Record<number, WordData[]>;
  sortedPointGroups: number[];
  title: string;
}

export function LandscapeWordsSection({
  wordsByPoints,
  sortedPointGroups,
  title,
}: LandscapeWordsSectionProps): React.ReactElement {
  return (
    <div className="bg-neo-cream text-neo-black dark:bg-neo-navy-light dark:text-white border-2 border-neo-black rounded-neo p-2 flex-1 overflow-y-auto">
      <h3 className="text-xs font-black uppercase text-neo-black/80 dark:text-neo-white mb-2">
        {title}
      </h3>
      <div className="space-y-1">
        {sortedPointGroups.map(points => {
          const words = wordsByPoints[points] || [];
          if (words.length === 0) return null;
          return (
            <div key={points} className="flex flex-wrap gap-1">
              {words.map(w => (
                <span
                  key={w.word}
                  className="px-2 py-0.5 rounded-neo border border-neo-black text-[10px] sm:text-xs font-bold"
                  style={{ backgroundColor: getPointColor(points), color: getTextColor(points) }}
                >
                  {w.word.toUpperCase()} +{w.score}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
