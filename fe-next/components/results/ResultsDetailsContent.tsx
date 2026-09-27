'use client';

import React from 'react';
import type { WordObject, Player } from '@/components/results/types';

import UniqueWordsSection from '@/components/results/UniqueWordsSection';
import MissedWords from '@/components/results/MissedWords';

type TFunction = (key: string, params?: Record<string, string | number>) => string;

export interface ResultsDetailsContentProps {
  allPlayerWords: Record<string, WordObject[]>;
  username: string | undefined;
  gameCode?: string;
  otherPlayers: Player[];
  missedWords: Array<{ word: string; score: number; foundBy: string[] }>;
  isHost: boolean;
  t: TFunction;
}

export const ResultsDetailsContent: React.FC<ResultsDetailsContentProps> = ({
  allPlayerWords,
  username,
  otherPlayers,
  missedWords,
  t,
}) => {
  return (
    <div className="space-y-3">
      {otherPlayers.length > 0 && (
        <UniqueWordsSection
          allPlayerWords={allPlayerWords}
          currentUsername={username || ''}
          t={t}
        />
      )}

      {missedWords && missedWords.length > 0 && (
        <MissedWords missedWords={missedWords} />
      )}
    </div>
  );
};

export default ResultsDetailsContent;
