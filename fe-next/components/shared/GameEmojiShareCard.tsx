'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ==================== Types ====================

export interface ClassicDailyShareData {
  mode: 'classic';
  /** Puzzle/challenge number shown in header */
  puzzleNumber: number;
  score: number;
  /** Words the player found (used to build emoji rows) */
  words: string[];
}

export interface BlastShareData {
  mode: 'blast';
  score: number;
  stars: 1 | 2 | 3;
  clearPercentage: number;
  wordsFound: string[];
  maxCombo: number;
  wavesCompleted: number;
  waveResults: Array<{ waveNumber: number; clearPercentage: number }>;
}

export type GameShareData = ClassicDailyShareData | BlastShareData;

export interface GameEmojiShareCardProps {
  data: GameShareData;
  t: (key: string) => string;
  /** Language for RTL support */
  language?: string;
}

// ==================== Emoji generators ====================

/** Classic Daily: one row per word, green squares = word length */
function buildClassicRows(words: string[]): string[] {
  if (words.length === 0) return ['⬛'];
  // Show up to 8 words to keep the card concise
  return words.slice(0, 8).map((w) => '🟩'.repeat(Math.min(w.length, 10)));
}

/** Blast: one row per wave + summary row */
function buildBlastRows(data: BlastShareData): string[] {
  const rows: string[] = [];

  // Wave rows: ⭐ for each wave cleared, dim squares for incomplete
  const totalWaves = Math.max(data.waveResults.length, data.wavesCompleted);
  for (let i = 0; i < totalWaves; i++) {
    const wave = data.waveResults[i];
    const waveNum = wave?.waveNumber ?? i + 1;
    const pct = wave?.clearPercentage ?? 0;
    if (pct >= 100) {
      rows.push(`⭐⭐⭐ Wave ${waveNum}`);
    } else if (pct >= 66) {
      rows.push(`⭐⭐✨ Wave ${waveNum} (${pct}%)`);
    } else if (pct >= 33) {
      rows.push(`⭐💥  Wave ${waveNum} (${pct}%)`);
    } else {
      rows.push(`💥    Wave ${waveNum} (${pct}%)`);
    }
  }

  // Combo row
  if (data.maxCombo >= 3) {
    rows.push(`🔥`.repeat(Math.min(data.maxCombo, 6)) + ` ${data.maxCombo}x combo`);
  }

  // Stars summary
  const starRow = '⭐'.repeat(data.stars) + '☆'.repeat(3 - data.stars);
  rows.push(starRow);

  return rows;
}

/** Build plain-text share string */
function buildShareText(data: GameShareData, t: (key: string) => string): string {
  if (data.mode === 'classic') {
    const rows = buildClassicRows(data.words);
    return [
      t('share.emojiCard.classicHeader').replace('{number}', String(data.puzzleNumber)),
      rows.join('\n'),
      `${data.score} ${t('common.pts')}`,
      'lexiclash.live',
    ].join('\n');
  } else {
    const rows = buildBlastRows(data);
    return [
      t('share.emojiCard.blastHeader'),
      rows.join('\n'),
      `${data.score} ${t('common.pts')} · ${data.clearPercentage}% ${t('blast.cleared')}`,
      'lexiclash.live',
    ].join('\n');
  }
}

// ==================== Component ====================

export const GameEmojiShareCard: React.FC<GameEmojiShareCardProps> = ({ data, t }) => {
  const [copied, setCopied] = useState(false);

  const shareText = buildShareText(data, t);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the card text
    }
  }, [shareText]);

  const handleNativeShare = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ text: shareText });
      } catch {
        // cancelled
        await handleCopy();
      }
    } else {
      await handleCopy();
    }
  }, [shareText, handleCopy]);

  const emojiRows =
    data.mode === 'classic'
      ? buildClassicRows(data.words)
      : buildBlastRows(data);

  const header =
    data.mode === 'classic'
      ? t('share.emojiCard.classicHeader').replace('{number}', String(data.puzzleNumber))
      : t('share.emojiCard.blastHeader');

  return (
    <motion.div
      data-testid="game-emoji-share-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-slate-900 border-3 border-neo-black rounded-neo shadow-hard p-4 font-mono text-sm select-all"
    >
      {/* Header */}
      <div className="text-neo-lime font-black text-xs uppercase tracking-widest mb-3">
        {header}
      </div>

      {/* Emoji rows */}
      <div className="space-y-1 mb-3 text-base leading-relaxed">
        {emojiRows.map((row, idx) => (
          <div key={idx}>{row}</div>
        ))}
      </div>

      {/* Score + domain */}
      <div className="border-t border-slate-700/50 pt-2 mt-2 mb-3">
        <div className="text-neo-white font-bold text-sm">
          {data.score.toLocaleString()} {t('common.pts')}
          {data.mode === 'blast' && (
            <span className="text-slate-400 font-normal ms-2">
              · {data.clearPercentage}% {t('blast.cleared')}
            </span>
          )}
        </div>
        <div className="text-slate-500 text-xs mt-0.5">lexiclash.live</div>
      </div>

      {/* Share buttons */}
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
    </motion.div>
  );
};

export default GameEmojiShareCard;
