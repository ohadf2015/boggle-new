'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { m } from 'framer-motion';
import { Eye, EyeOff, Share2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NeoPanel } from '@/components/ui/panel';
import type { Language } from '@/types';

interface WordEntry {
  word: string;
  found: boolean;
  /** Per-letter feedback kept on the type for callers; never rendered as Wordle squares. */
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

const LENGTH_BAR_CLASS: Record<number, string> = {
  2: 'bg-slate-400',
  3: 'bg-neo-cyan',
  4: 'bg-neo-lime',
  5: 'bg-neo-pink',
  6: 'bg-neo-purple',
  7: 'bg-neo-orange',
};

function barClassForLength(len: number): string {
  if (len >= 7) return LENGTH_BAR_CLASS[7];
  return LENGTH_BAR_CLASS[len] ?? LENGTH_BAR_CLASS[3];
}

function countByLength(words: WordEntry[]): Array<{ len: number; found: number; missed: number }> {
  const map = new Map<number, { found: number; missed: number }>();
  for (const w of words) {
    const len = Math.max(1, w.word.length);
    const row = map.get(len) ?? { found: 0, missed: 0 };
    if (w.found) row.found += 1;
    else row.missed += 1;
    map.set(len, row);
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([len, counts]) => ({ len, ...counts }));
}

function longestFound(words: WordEntry[]): WordEntry | null {
  return words
    .filter((w) => w.found && w.word.length > 0)
    .sort((a, b) => b.word.length - a.word.length)[0] ?? null;
}

/** Plain-text share: LexiClash recap, never a Wordle letter-grid. */
export function buildDailyShareText(
  puzzleNumber: number,
  score: number,
  solved: boolean,
  words: WordEntry[],
  t: (key: string) => string,
): string {
  const found = words.filter((w) => w.found).length;
  const longest = longestFound(words);
  const header = t('daily.puzzleNumber').replace('{number}', String(puzzleNumber));
  const status = solved ? '✅' : '❌';
  const wordsLine = `${found} ${t('share.words')}`;
  const longestLine = longest
    ? `${t('share.longest')} ${longest.word.length}`
    : null;
  return [
    `⚡ LEXICLASH · ${header} ${status}`,
    [wordsLine, longestLine].filter(Boolean).join(' · '),
    `${score.toLocaleString()} ${t('wordHunt.leaderboard.pts')}`,
    'lexiclash.live',
  ].join('\n');
}

export const EmojiShareCard: React.FC<EmojiShareCardProps> = ({
  puzzleNumber,
  score,
  solved,
  words,
  language: _language,
  t,
}) => {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareText = useMemo(
    () => buildDailyShareText(puzzleNumber, score, solved, words, t),
    [puzzleNumber, score, solved, words, t],
  );

  const foundCount = words.filter((w) => w.found).length;
  const missedCount = words.length - foundCount;
  const lengthRows = useMemo(() => countByLength(words), [words]);
  const maxBucket = Math.max(1, ...lengthRows.map((r) => r.found + r.missed));
  const longest = longestFound(words);

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
    <NeoPanel asChild tone="navy" className="p-4 select-all">
    <m.div
      data-testid="emoji-share-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-neo-lime font-black text-xs uppercase tracking-[0.18em]">
          ⚡ LEXICLASH · {t('daily.puzzleNumber').replace('{number}', String(puzzleNumber))} {solved ? '✅' : '❌'}
        </span>
        <button type="button"
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

      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <div className="text-neo-lime font-black text-3xl leading-none tabular-nums tracking-tight">
            {score.toLocaleString()}
          </div>
          <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">
            {t('wordHunt.leaderboard.pts')}
          </div>
        </div>
        <div className="text-end">
          <div className="text-neo-cyan font-black text-xl leading-none tabular-nums">
            {foundCount}
          </div>
          <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">
            {t('share.words')}
          </div>
        </div>
      </div>

      {lengthRows.length > 0 && (
        <div data-testid="lexiclash-length-bars" className="space-y-1.5 mb-4">
          {lengthRows.map((row) => {
            const total = row.found + row.missed;
            const foundPct = Math.max(8, Math.round((row.found / maxBucket) * 100));
            return (
              <div key={`len-${row.len}`} className="flex items-center gap-2">
                <span className="w-4 text-[10px] font-black text-slate-400 tabular-nums">{row.len}</span>
                <div className="flex-1 h-2 rounded-sm bg-neo-navy-light overflow-hidden border border-neo-black">
                  <div
                    className={`h-full ${barClassForLength(row.len)}`}
                    style={{ width: `${foundPct}%` }}
                  />
                </div>
                <span className="w-8 text-[10px] font-bold text-slate-400 tabular-nums text-end">
                  {row.found}/{total}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {longest && (
        <div className="mb-3 px-3 py-2 rounded-neo border-2 border-neo-lime/30 bg-neo-lime/10">
          <div className="text-[10px] font-black uppercase tracking-widest text-neo-lime">
            {t('share.longest')}
          </div>
          <div className="font-black text-lg tracking-widest uppercase text-neo-white truncate">
            {revealed ? longest.word : '●'.repeat(longest.word.length)}
          </div>
        </div>
      )}

      {revealed && (
        <div className="mb-3 flex flex-wrap gap-1">
          {words.filter((w) => w.found).slice(0, 12).map((entry, idx) => (
            <span
              key={`found-${idx}-${entry.word}`}
              className="px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide rounded-sm bg-neo-navy-light text-neo-cyan border border-neo-black"
            >
              {entry.word}
            </span>
          ))}
        </div>
      )}

      {missedCount > 0 && !revealed && (
        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-3">
          {missedCount} {t('share.words')}
        </div>
      )}

      <div className="border-t border-slate-700/50 pt-2 mt-1 mb-3">
        <div className="text-slate-500 text-xs font-mono tracking-wider">lexiclash.live</div>
      </div>

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
    </NeoPanel>
  );
};

export default EmojiShareCard;
