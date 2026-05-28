'use client';

import React, { useState, useCallback } from 'react';
import { m } from 'framer-motion';
import { Eye, EyeOff, Share2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

/** Build plain-text share string for daily challenge (E-2) */
function buildDailyShareText(puzzleNumber: number, score: number, solved: boolean, words: WordEntry[], t: (key: string) => string): string {
  const rows = words.slice(0, 8).map(wordToEmoji);
  return [
    `${t('daily.puzzleNumber').replace('{number}', String(puzzleNumber))} ${solved ? '✅' : '❌'}`,
    rows.join('\n'),
    `${score} ${t('wordHunt.leaderboard.pts')}`,
    'https://lexiclash.live',
  ].join('\n');
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
  const [copied, setCopied] = useState(false);

  const shareText = buildDailyShareText(puzzleNumber, score, solved, words, t);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  }, [shareText]);

  const handleNativeShare = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ text: shareText, url: 'https://lexiclash.live' });
      } catch {
        await handleCopy();
      }
    } else {
      await handleCopy();
    }
  }, [shareText, handleCopy]);

  return (
    <m.div
      data-testid="emoji-share-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-neo-navy border-3 border-neo-black rounded-neo shadow-hard p-4 font-mono text-sm select-all"
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
          className="p-1 rounded-lg hover:bg-neo-navy-light transition-colors text-slate-400 hover:text-slate-200"
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
          <div key={`word-${idx}-${entry.word}`} className="flex items-center gap-2">
            <span className="text-base leading-none">{wordToEmoji(entry)}</span>
            <span className={`text-xs uppercase tracking-wide ${entry.found ? 'text-slate-400' : 'text-slate-600'}`}>
              {revealed ? entry.word : maskWord(entry.word)}
            </span>
          </div>
        ))}
      </div>

      {/* Score + domain */}
      <div className="border-t border-slate-700/50 pt-2 mt-2 mb-3">
        <div className="text-neo-white font-bold text-sm">{score} {t('wordHunt.leaderboard.pts')}</div>
        <div className="text-slate-500 text-xs mt-0.5">lexiclash.live</div>
      </div>

      {/* Share buttons (E-2 — were missing entirely) */}
      <div className="flex gap-2 select-none">
        <Button
          onClick={handleNativeShare}
          size="sm"
          className="flex-1 py-2 bg-neo-cyan text-neo-black border-2 border-neo-black rounded-neo shadow-hard-sm font-black text-xs uppercase hover:shadow-hard transition-all"
        >
          <Share2 className="w-3.5 h-3.5 me-1" />
          {t('share.emojiCard.share')}
        </Button>
        <Button
          onClick={handleCopy}
          size="sm"
          aria-label={copied ? t('common.copied') : t('share.emojiCard.copy')}
          className="flex-1 py-2 bg-neo-navy text-white border-2 border-neo-black rounded-neo shadow-hard-sm text-xs uppercase hover:shadow-hard transition-all"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 me-1 text-neo-cyan" />
          ) : (
            <Copy className="w-3.5 h-3.5 me-1" />
          )}
          {copied ? t('common.copied') : t('share.emojiCard.copy')}
        </Button>
      </div>
    </m.div>
  );
};

export default EmojiShareCard;
