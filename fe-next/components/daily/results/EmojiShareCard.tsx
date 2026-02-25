'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { Language } from '@/types';

interface WordEntry {
  word: string;
  found: boolean;
}

export interface EmojiShareCardProps {
  puzzleNumber: number;
  score: number;
  solved: boolean;
  words: WordEntry[];
  language: Language;
  t: (key: string) => string;
}

function wordToEmoji(entry: WordEntry): string {
  const square = entry.found ? '🟩' : '⬛';
  return square.repeat(entry.word.length);
}

export const EmojiShareCard: React.FC<EmojiShareCardProps> = ({
  puzzleNumber,
  score,
  solved,
  words,
  language: _language,  // kept in interface for future RTL support
  t,
}) => {
  return (
    <motion.div
      data-testid="emoji-share-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-slate-900 border-3 border-neo-black rounded-neo shadow-hard p-4 font-mono text-sm select-all"
    >
      {/* Puzzle header */}
      <div className="text-neo-lime font-black text-xs uppercase tracking-widest mb-3">
        {t('daily.puzzleNumber').replace('{number}', String(puzzleNumber))} {solved ? '✅' : '❌'}
      </div>

      {/* Emoji rows */}
      <div className="space-y-1 mb-3">
        {words.map((entry) => (
          <div key={entry.word} className="flex items-center gap-2">
            <span className="text-base leading-none">{wordToEmoji(entry)}</span>
            {entry.found && (
              <span className="text-slate-400 text-xs uppercase tracking-wide">
                {entry.word}
              </span>
            )}
            {!entry.found && (
              <span className="text-slate-600 text-xs">????</span>
            )}
          </div>
        ))}
      </div>

      {/* Score + domain */}
      <div className="border-t border-slate-700/50 pt-2 mt-2">
        <div className="text-neo-white font-bold text-sm">{score} {t('wordHunt.leaderboard.pts')}</div>
        <div className="text-slate-500 text-xs mt-0.5">lexiclash.live</div>
      </div>
    </motion.div>
  );
};

export default EmojiShareCard;
