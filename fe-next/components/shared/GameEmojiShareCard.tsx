'use client';

import React, { useState, useCallback } from 'react';
import { m } from 'framer-motion';
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

export interface SingleplayerShareData {
  mode: 'singleplayer';
  score: number;
  words: string[];
  maxCombo?: number;
  rank?: number;
  totalPlayers?: number;
  isNewHighScore?: boolean;
}

export interface AdventureShareData {
  mode: 'adventure';
  score: number;
  stars: number;
  worldNumber: number;
  levelNumber: number;
  objectivesCompleted: number;
  objectivesTotal: number;
  isBoss?: boolean;
}

export interface DrillShareData {
  mode: 'drill';
  drillType: string;
  score: number;
  wordsFound: number;
  totalWords?: number;
  timeSpent?: number;
}

export type GameShareData = ClassicDailyShareData | BlastShareData | SingleplayerShareData | AdventureShareData | DrillShareData;

export interface GameEmojiShareCardProps {
  data: GameShareData;
  t: (key: string) => string;
  /** Language for RTL support */
  language?: string;
  /** Telemetry hook fired when user presses Share or Copy */
  onShareClick?: (method: 'native' | 'copy') => void;
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

/** Singleplayer: word count blocks + combo flame + rank */
function buildSingleplayerRows(data: SingleplayerShareData): string[] {
  const rows: string[] = [];
  // Word length distribution as colored blocks
  const lengths = data.words.map(w => w.length);
  const grouped = new Map<number, number>();
  for (const len of lengths) grouped.set(len, (grouped.get(len) || 0) + 1);
  const sortedLens = [...grouped.entries()].sort((a, b) => b[0] - a[0]);
  for (const [len, count] of sortedLens.slice(0, 5)) {
    rows.push(`${'🟩'.repeat(Math.min(count, 8))} ${len}${'\u20E3'}`);
  }
  // Combo
  if (data.maxCombo && data.maxCombo >= 3) {
    rows.push('🔥'.repeat(Math.min(data.maxCombo, 6)) + ` ${data.maxCombo}x combo`);
  }
  // Rank
  if (data.rank && data.totalPlayers) {
    const medal = data.rank === 1 ? '🥇' : data.rank === 2 ? '🥈' : data.rank === 3 ? '🥉' : '🏅';
    rows.push(`${medal} #${data.rank}/${data.totalPlayers}`);
  }
  if (data.isNewHighScore) rows.push('🏆 New High Score!');
  return rows;
}

/** Adventure: stars + objectives + world/level */
function buildAdventureRows(data: AdventureShareData): string[] {
  const rows: string[] = [];
  rows.push('⭐'.repeat(data.stars) + '☆'.repeat(Math.max(0, 3 - data.stars)));
  rows.push(`✅ ${data.objectivesCompleted}/${data.objectivesTotal} objectives`);
  if (data.isBoss) rows.push('👹 Boss defeated!');
  return rows;
}

/** Drill: score + accuracy + time */
function buildDrillRows(data: DrillShareData): string[] {
  const rows: string[] = [];
  if (data.totalWords) {
    const pct = Math.round((data.wordsFound / data.totalWords) * 100);
    const bars = Math.round(pct / 10);
    rows.push('🟩'.repeat(bars) + '⬜'.repeat(10 - bars) + ` ${pct}%`);
  }
  rows.push(`📝 ${data.wordsFound} words`);
  if (data.timeSpent) rows.push(`⏱️ ${data.timeSpent}s`);
  return rows;
}

/** Get header + rows + score line for any mode */
function getShareParts(data: GameShareData, t: (key: string) => string): { header: string; rows: string[]; scoreLine: string } {
  switch (data.mode) {
    case 'classic':
      return {
        header: t('share.emojiCard.classicHeader').replace('{number}', String(data.puzzleNumber)),
        rows: buildClassicRows(data.words),
        scoreLine: `${data.score.toLocaleString()} ${t('common.pts')}`,
      };
    case 'blast':
      return {
        header: t('share.emojiCard.blastHeader'),
        rows: buildBlastRows(data),
        scoreLine: `${data.score.toLocaleString()} ${t('common.pts')} · ${data.clearPercentage}% ${t('blast.cleared')}`,
      };
    case 'singleplayer':
      return {
        header: t('share.emojiCard.singleplayerHeader'),
        rows: buildSingleplayerRows(data),
        scoreLine: `${data.score.toLocaleString()} ${t('common.pts')} · ${data.words.length} ${t('common.words')}`,
      };
    case 'adventure':
      return {
        header: t('share.emojiCard.adventureHeader')
          .replace('{world}', String(data.worldNumber))
          .replace('{level}', String(data.levelNumber)),
        rows: buildAdventureRows(data),
        scoreLine: `${data.score.toLocaleString()} ${t('common.pts')}`,
      };
    case 'drill':
      return {
        header: t('share.emojiCard.drillHeader').replace('{type}', data.drillType),
        rows: buildDrillRows(data),
        scoreLine: `${data.score.toLocaleString()} ${t('common.pts')}`,
      };
  }
}

/** Build plain-text share string */
function buildShareText(data: GameShareData, t: (key: string) => string): string {
  const { header, rows, scoreLine } = getShareParts(data, t);
  return [header, rows.join('\n'), scoreLine, 'lexiclash.live'].join('\n');
}

// ==================== Component ====================

export const GameEmojiShareCard: React.FC<GameEmojiShareCardProps> = ({ data, t, onShareClick }) => {
  const [copied, setCopied] = useState(false);

  const shareText = buildShareText(data, t);

  const handleCopy = useCallback(async () => {
    onShareClick?.('copy');
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the card text
    }
  }, [shareText, onShareClick]);

  const handleNativeShare = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      onShareClick?.('native');
      try {
        await navigator.share({ text: shareText, url: 'https://lexiclash.live' });
      } catch {
        // cancelled — fall back to copy without re-firing telemetry
        try {
          await navigator.clipboard.writeText(shareText);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {}
      }
    } else {
      await handleCopy();
    }
  }, [shareText, handleCopy, onShareClick]);

  const { header, rows: emojiRows, scoreLine } = getShareParts(data, t);

  return (
    <m.div
      data-testid="game-emoji-share-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-neo-navy border-3 border-neo-black rounded-neo shadow-hard p-4 font-mono text-sm select-all"
    >
      {/* Header */}
      <div className="text-neo-lime font-black text-xs uppercase tracking-widest mb-3">
        {header}
      </div>

      {/* Emoji rows */}
      <div className="space-y-1 mb-3 text-base leading-relaxed">
        {emojiRows.map((row, idx) => (
          <div key={`row-${idx}-${row}`}>{row}</div>
        ))}
      </div>

      {/* Score + domain */}
      <div className="border-t border-slate-700/50 pt-2 mt-2 mb-3">
        <div className="text-neo-white font-bold text-sm">{scoreLine}</div>
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
    </m.div>
  );
};

export default GameEmojiShareCard;
