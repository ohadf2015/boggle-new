'use client';

import React, { useState, useCallback } from 'react';
import { ShareRecapCard } from '@/components/shared/ShareRecapCard';
import {
  buildShareText,
  getShareParts,
  type GameShareData,
} from '@/components/shared/gameShareParts';

export type {
  ClassicDailyShareData,
  BlastShareData,
  SingleplayerShareData,
  AdventureShareData,
  DrillShareData,
  GameShareData,
} from '@/components/shared/gameShareParts';

export interface GameEmojiShareCardProps {
  data: GameShareData;
  t: (key: string) => string;
  language?: string;
  onShareClick?: (method: 'native' | 'copy') => void;
}

function longestOf(words: string[]): string | null {
  if (words.length === 0) return null;
  return words.reduce((a, b) => (b.length > a.length ? b : a));
}

function lengthBarsFor(words: string[]): Array<{ len: number; found: number; total: number }> {
  const grouped = new Map<number, number>();
  for (const w of words) grouped.set(w.length, (grouped.get(w.length) || 0) + 1);
  return [...grouped.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([len, count]) => ({ len, found: count, total: count }));
}

export const GameEmojiShareCard: React.FC<GameEmojiShareCardProps> = ({ data, t, onShareClick }) => {
  const [copied, setCopied] = useState(false);
  const shareText = buildShareText(data, t);
  const parts = getShareParts(data, t);

  const findWords = data.mode === 'classic' || data.mode === 'singleplayer' ? data.words : [];
  const longest = findWords.length ? longestOf(findWords) : null;
  const lengthBars = findWords.length ? lengthBarsFor(findWords) : undefined;

  const handleCopy = useCallback(async () => {
    onShareClick?.('copy');
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  }, [shareText, onShareClick]);

  const handleNativeShare = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      onShareClick?.('native');
      try {
        await navigator.share({ text: shareText, url: 'https://lexiclash.live' });
      } catch {
        try {
          await navigator.clipboard.writeText(shareText);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch { /* ignore */ }
      }
    } else {
      await handleCopy();
    }
  }, [shareText, handleCopy, onShareClick]);

  return (
    <ShareRecapCard
      testId="game-emoji-share-card"
      brand="LexiClash"
      parts={parts}
      longestLabel={longest ? t('share.longest') : undefined}
      longestWord={longest}
      revealed
      lengthBars={lengthBars}
      onShare={handleNativeShare}
      onCopy={handleCopy}
      copied={copied}
      shareLabel={t('share.emojiCard.share')}
      copyLabel={t('share.emojiCard.copy')}
      copiedLabel={t('common.copied')}
    />
  );
};

export default GameEmojiShareCard;
