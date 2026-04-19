'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
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
  isCurrentPlayerReady?: boolean;
  onMarkReady?: () => void;
}

export const ResultsDetailsContent: React.FC<ResultsDetailsContentProps> = ({
  allPlayerWords,
  username,
  gameCode,
  otherPlayers,
  missedWords,
  isHost,
  t,
  isCurrentPlayerReady,
  onMarkReady,
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

      {gameCode && !isHost && onMarkReady && isCurrentPlayerReady === false && (
        <div className="sticky bottom-4 z-20 flex justify-center pointer-events-none">
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onMarkReady}
            className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 bg-neo-lime text-neo-black font-black text-sm uppercase border-3 border-neo-black rounded-neo shadow-hard hover:-translate-x-px hover:-translate-y-px hover:shadow-hard-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed transition-all"
          >
            <Check className="w-4 h-4" />
            {t('results.imReady')}
          </motion.button>
        </div>
      )}
    </div>
  );
};

export default ResultsDetailsContent;
