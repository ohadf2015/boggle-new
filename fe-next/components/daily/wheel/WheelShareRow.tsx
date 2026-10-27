'use client';

import React, { useCallback, useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import { buildShareText } from '@/components/shared/gameShareParts';
import { stripEmoji } from '@/lib/share/stripEmoji';

type T = (key: string, params?: Record<string, string | number>) => string;

interface WheelShareRowProps {
  t: T;
  score: number;
  wordsFound: string[];
  puzzleNumber: number;
  onShareClick?: (method: 'native' | 'copy') => void;
}

export default function WheelShareRow({ t, score, wordsFound, puzzleNumber, onShareClick }: WheelShareRowProps) {
  const [copied, setCopied] = useState(false);
  const shareText = stripEmoji(
    buildShareText({ mode: 'classic', puzzleNumber, score, words: wordsFound }, t as (k: string) => string),
  );

  const copy = useCallback(async () => {
    onShareClick?.('copy');
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  }, [shareText, onShareClick]);

  const share = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.share) return copy();
    onShareClick?.('native');
    try {
      await navigator.share({ text: shareText, url: 'https://lexiclash.live' });
    } catch { /* dismissed */ }
  }, [shareText, copy, onShareClick]);

  if (wordsFound.length === 0) return null;

  return (
    <div data-testid="word-wheel-share" className="grid grid-cols-[1fr_auto] gap-2">
      <button
        type="button"
        onClick={share}
        className="h-12 rounded-neo border-3 border-neo-black bg-neo-cyan text-neo-black font-neo-display font-black text-base shadow-hard flex items-center justify-center gap-2 active:shadow-hard-pressed active:translate-x-px active:translate-y-px"
      >
        <Share2 className="w-5 h-5" strokeWidth={2.5} aria-hidden />
        {t('share.emojiCard.share')}
      </button>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? t('common.copied') : t('share.emojiCard.copy')}
        className="h-12 px-4 rounded-neo border-3 border-neo-black bg-neo-navy text-neo-white font-bold text-sm shadow-hard flex items-center gap-2 active:shadow-hard-pressed active:translate-x-px active:translate-y-px"
      >
        {copied ? <Check className="w-4 h-4" aria-hidden /> : <Copy className="w-4 h-4" aria-hidden />}
        {copied ? t('common.copied') : t('share.emojiCard.copy')}
      </button>
    </div>
  );
}
