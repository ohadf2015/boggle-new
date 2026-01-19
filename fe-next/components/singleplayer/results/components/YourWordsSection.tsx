'use client';

/**
 * YourWordsSection - Display player's found words
 *
 * Shows words grouped by points with invalid words section.
 */

import React, { useMemo } from 'react';
import { Hash } from 'lucide-react';
import { WordPointsGroup, InvalidWordsSection } from '@/components/results/WordPointsGroup';
import type { WordObject } from '@/components/results/types';

interface YourWordsSectionProps {
  wordsByPoints: Record<number, WordObject[]>;
  sortedPointGroups: number[];
  invalidWords: WordObject[];
  wordCount: number;
  title: string;
  t: (key: string) => string | undefined;
}

export function YourWordsSection({
  wordsByPoints,
  sortedPointGroups,
  invalidWords,
  wordCount,
  title,
  t,
}: YourWordsSectionProps): React.ReactElement {
  // Wrap t to satisfy stricter component requirements
  const safeT = useMemo(() => (key: string, params?: Record<string, string | number>): string => {
    const result = t(key);
    if (result === undefined) return key;
    if (!params) return result;
    // Apply params replacement
    return Object.entries(params).reduce(
      (str, [k, v]) => str.replace(`{${k}}`, String(v)),
      result
    );
  }, [t]);

  return (
    <div className="bg-neo-navy border-3 border-neo-black rounded-neo p-3 shadow-hard">
      <div className="flex items-center gap-2 mb-2">
        <Hash className="w-4 h-4 text-neo-lime" />
        <h3 className="text-sm font-black uppercase text-white">
          {title} ({wordCount})
        </h3>
      </div>
      <div className="space-y-2">
        <WordPointsGroup wordsByPoints={wordsByPoints} sortedPointGroups={sortedPointGroups} t={safeT} mode="chip" />
        <InvalidWordsSection invalidWords={invalidWords} t={safeT} mode="chip" />
      </div>
    </div>
  );
}
