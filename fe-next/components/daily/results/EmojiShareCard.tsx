'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import type { Language } from '@/types';

interface WordEntry {
  word: string;
  found: boolean;
  /** Per-letter feedback: green (correct), yellow (present), gray (absent) */
  feedback?: Array<{ letter: string; feedback: 'green' | 'yellow' | 'gray' }>;
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
  // Use per-letter feedback for Wordle-style colored squares
  if (entry.feedback && entry.feedback.length > 0) {
    return entry.feedback
      .map((f) => {
        if (f.feedback === 'green') return '🟩';
        if (f.feedback === 'yellow') return '🟨';
        return '⬛';
      })
      .join('');
  }
  // Fallback: all green if found, all black if not
  const square = entry.found ? '🟩' : '⬛';
  return square.repeat(entry.word.length);
}

/** Mask a word with asterisks, keeping length visible */
function maskWord(word: string): string {
  return '*'.repeat(word.length);
}

export const EmojiShareCard: React.FC<EmojiShareCardProps> = ({
  puzzleNumber,
  score,
  solved,
  words,
  language: _language,  // kept in interface for future RTL support
  t,
}) => {
  const [revealed, setRevealed] = useState(false);

  return (
    <motion.div
      data-testid="emoji-share-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-slate-900 border-3 border-neo-black rounded-neo shadow-hard p-4 font-mono text-sm select-all"
    >
      {/* Puzzle header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-neo-lime font-black text-xs uppercase tracking-widest">
          {t('daily.puzzleNumber').replace('{number}', String(puzzleNumber))} {solved ? '✅' : '❌'}
        </span>
        <button
          data-testid="emoji-reveal-toggle"
          onClick={(e) => {
            e.stopPropagation();
            setRevealed(!revealed);
          }}
          className="p-1 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-200"
          aria-label={revealed ? 'Hide words' : 'Reveal words'}
        >
          {revealed ? (
            <EyeOff className="w-3.5 h-3.5" />
          ) : (
            <Eye className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Emoji rows */}
      <div className="space-y-1 mb-3">
        {words.map((entry, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-base leading-none">{wordToEmoji(entry)}</span>
            <span className={`text-xs uppercase tracking-wide ${entry.found ? 'text-slate-400' : 'text-slate-600'}`}>
              {revealed ? entry.word : maskWord(entry.word)}
            </span>
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
