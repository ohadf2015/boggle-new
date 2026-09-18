'use client';

import React, { useState, useCallback, useMemo } from 'react';
import type { Language } from '@/types';
import { ShareRecapCard } from '@/components/shared/ShareRecapCard';
import type { ShareParts } from '@/components/shared/gameShareParts';
import { shareWithFallback } from '@/utils/shareWithFallback';
import { stripEmoji } from '@/lib/share/stripEmoji';

interface WordEntry {
  word: string;
  found: boolean;
  feedback?: Array<{ letter: string; feedback: 'green' | 'yellow' | 'gray' }>;
}

export interface EmojiShareCardProps {
  puzzleNumber: number;
  score: number;
  solved: boolean;
  words: WordEntry[];
  language: Language;
  t: (key: string) => string;
  /** "Beat my score" link to this same puzzle. Without it a shared result
   *  sends the friend to the homepage instead of the board they were dared on. */
  shareUrl?: string;
}

function countByLength(words: WordEntry[]): Array<{ len: number; found: number; total: number }> {
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
    .map(([len, counts]) => ({ len, found: counts.found, total: counts.found + counts.missed }));
}

function longestFound(words: WordEntry[]): WordEntry | null {
  return words
    .filter((w) => w.found && w.word.length > 0)
    .sort((a, b) => b.word.length - a.word.length)[0] ?? null;
}

function buildParts(
  puzzleNumber: number,
  score: number,
  solved: boolean,
  words: WordEntry[],
  t: (key: string) => string,
): ShareParts {
  const found = words.filter((w) => w.found).length;
  const longest = longestFound(words);
  const stats = [
    { value: String(found), label: t('share.words') },
    {
      value: solved ? t('share.emojiCard.solved') : t('share.emojiCard.unsolved'),
      label: t('share.emojiCard.status'),
    },
  ];
  if (longest) {
    stats.push({ value: String(longest.word.length), label: t('share.longest') });
  }
  return {
    header: t('daily.puzzleNumber').replace('{number}', String(puzzleNumber)),
    score: score.toLocaleString(),
    scoreLabel: t('wordHunt.leaderboard.pts'),
    stats,
    details: [],
  };
}

/** Plain-text share: labeled LexiClash recap, no emoji grid. */
export function buildDailyShareText(
  puzzleNumber: number,
  score: number,
  solved: boolean,
  words: WordEntry[],
  t: (key: string) => string,
  shareUrl?: string,
): string {
  const parts = buildParts(puzzleNumber, score, solved, words, t);
  return stripEmoji([
    `LexiClash · ${parts.header}`,
    `${parts.score} ${parts.scoreLabel}`,
    parts.stats.map((s) => `${s.value} ${s.label}`).join(' · '),
    shareUrl ?? 'lexiclash.live',
  ].join('\n'));
}

export const EmojiShareCard: React.FC<EmojiShareCardProps> = ({
  puzzleNumber,
  score,
  solved,
  words,
  language: _language,
  t,
  shareUrl,
}) => {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareText = useMemo(
    () => buildDailyShareText(puzzleNumber, score, solved, words, t, shareUrl),
    [puzzleNumber, score, solved, words, t, shareUrl],
  );
  const parts = useMemo(
    () => buildParts(puzzleNumber, score, solved, words, t),
    [puzzleNumber, score, solved, words, t],
  );
  const lengthBars = useMemo(() => countByLength(words), [words]);
  const longest = longestFound(words);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  }, [shareText]);

  const handleNativeShare = useCallback(async () => {
    // Same contract as shareWithFallback: native share gets the link as its
    // own `url` field; only the clipboard text carries it as the last line.
    const body = shareText.split('\n').slice(0, -1).join('\n');
    const result = await shareWithFallback({
      text: body,
      url: shareUrl ?? 'https://lexiclash.live',
      clipboardText: shareText,
    });
    if (result === 'copied') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareText, shareUrl]);

  return (
    <ShareRecapCard
      testId="emoji-share-card"
      brand="LexiClash"
      parts={parts}
      longestLabel={t('share.longest')}
      longestWord={longest?.word ?? null}
      revealed={revealed}
      lengthBars={lengthBars}
      extra={
        <button
          type="button"
          data-testid="emoji-reveal-toggle"
          onClick={(e) => {
            e.stopPropagation();
            setRevealed((v) => !v);
          }}
          className="relative mb-3 text-[10px] font-black uppercase tracking-widest text-neo-cyan"
        >
          {revealed ? t('share.emojiCard.hideWords') : t('share.emojiCard.revealWords')}
        </button>
      }
      onShare={handleNativeShare}
      onCopy={handleCopy}
      copied={copied}
      shareLabel={t('share.emojiCard.share')}
      copyLabel={t('share.emojiCard.copy')}
      copiedLabel={t('common.copied')}
    />
  );
};

export default EmojiShareCard;
