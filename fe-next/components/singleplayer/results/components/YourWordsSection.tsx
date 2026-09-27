'use client';

/**
 * YourWordsSection - Display player's found words
 *
 * Shows words grouped by points with invalid words section.
 * Wrapped in CollapsibleSection for consistent mobile experience.
 */

import React, { useMemo } from 'react';
import { Hash } from 'lucide-react';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import { WordPointsGroup, InvalidWordsSection } from '@/components/results/WordPointsGroup';
import type { WordObject } from '@/components/results/types';

interface YourWordsSectionProps {
  wordsByPoints: Record<number, WordObject[]>;
  sortedPointGroups: number[];
  invalidWords: WordObject[];
  wordCount: number;
  title?: string;
  t: (key: string) => string | undefined;
  defaultExpanded?: boolean;
}

export function YourWordsSection({
  wordsByPoints,
  sortedPointGroups,
  invalidWords,
  wordCount,
  title,
  t,
  defaultExpanded = true,
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
    <CollapsibleSection
      title={title}
      icon={<Hash className="w-4 h-4" />}
      badge={wordCount}
      defaultExpanded={defaultExpanded}
      variant="tertiary"
      className="shadow-hard"
    >
      <div className="space-y-2">
        <WordPointsGroup wordsByPoints={wordsByPoints} sortedPointGroups={sortedPointGroups} t={safeT} mode="chip" />
        <InvalidWordsSection invalidWords={invalidWords} t={safeT} mode="chip" />
      </div>
    </CollapsibleSection>
  );
}
