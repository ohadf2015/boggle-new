'use client';

import { useState, useCallback, useMemo } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Copy, Check, Share2, Star, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LevelShareCardProps {
  worldNumber: number;
  levelNumber: number;
  worldName: string;
  stars: number;
  score: number;
  bestWord: string;
  wordsFound: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function buildShareText(props: LevelShareCardProps): string {
  const { worldNumber, levelNumber, bestWord, stars, score, wordsFound } = props;
  const starRow = '⭐'.repeat(stars) + '☆'.repeat(Math.max(0, 3 - stars));

  return [
    `${starRow} PERFECT CLEAR!`,
    `W${worldNumber}-L${levelNumber}`,
    '',
    `🏆 ${score.toLocaleString()} pts`,
    `💎 Best word: "${bestWord.toUpperCase()}"`,
    `📝 ${wordsFound} words found`,
    '',
    '🎮 lexiclash.live/adventure',
  ].join('\n');
}

export function LevelShareCard(props: LevelShareCardProps) {
  const { worldNumber, levelNumber, stars, score, bestWord, wordsFound, t } = props;
  const [copied, setCopied] = useState(false);

  const shareText = useMemo(() => buildShareText(props), [props]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback silently */ }
  }, [shareText]);

  const handleNativeShare = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ text: shareText, url: 'https://lexiclash.live/adventure' });
      } catch {
        await handleCopy();
      }
    } else {
      await handleCopy();
    }
  }, [shareText, handleCopy]);

  return (
    <AdaptiveMotion.div
      data-testid="level-share-card"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className={cn(
        'relative overflow-hidden border-3 rounded-neo shadow-hard p-5 select-all',
        'bg-linear-to-br from-neo-black via-slate-900 to-neo-black',
        'border-neo-lime',
      )}
    >
      {/* Glow */}
      <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full blur-2xl pointer-events-none bg-neo-lime/10" />

      {/* Header */}
      <div className="relative flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-neo-lime" />
        <span className="font-black text-xs uppercase tracking-[0.15em] text-neo-lime">
          W{worldNumber}-L{levelNumber}
        </span>
        <div className="flex-1 h-px bg-neo-lime/20" />
        <span className="font-black text-xs uppercase tracking-wider text-neo-white">
          {t('adventure.share.perfectClear')}
        </span>
      </div>

      {/* Stars + Score row */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-xl tracking-wider" aria-label={`${stars} of 3 stars`}>
          {Array.from({ length: 3 }, (_, i) => (
            <AdaptiveMotion.span
              key={`star-${i}`}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2 + i * 0.1, type: 'spring', stiffness: 300 }}
              className={cn('inline-block', i >= stars && 'opacity-25 grayscale')}
            >
              ⭐
            </AdaptiveMotion.span>
          ))}
        </div>
        <AdaptiveMotion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-neo-white font-black text-base tabular-nums"
        >
          {score.toLocaleString()}{' '}
          <span className="text-neo-white font-normal text-xs">{t('common.pts')}</span>
        </AdaptiveMotion.div>
      </div>

      {/* Best word */}
      <AdaptiveMotion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.25, type: 'spring' }}
        className="flex items-center gap-3 mb-3 p-3 border-2 rounded-neo bg-neo-lime/10 border-neo-lime/30"
      >
        <Star className="w-5 h-5 shrink-0 text-neo-lime" />
        <div className="min-w-0">
          <div className="text-neo-white text-[10px] font-bold uppercase tracking-wider">
            {t('adventure.share.bestWord')}
          </div>
          <div className="font-black text-xl tracking-widest uppercase truncate text-neo-lime">
            {bestWord.toUpperCase()}
          </div>
        </div>
      </AdaptiveMotion.div>

      {/* Stats row */}
      <div className="flex items-center gap-4 mb-3 text-neo-white text-xs font-bold">
        <span>{wordsFound} {t('adventure.share.wordsFound')}</span>
      </div>

      {/* Domain */}
      <div className="text-neo-white text-[10px] font-mono tracking-wider mb-4">
        lexiclash.live
      </div>

      {/* Buttons */}
      <div className="flex gap-2 select-none relative">
        <Button
          onClick={handleNativeShare}
          size="sm"
          className={cn(
            'flex-1 py-2.5 border-2 border-neo-black rounded-neo shadow-hard-sm',
            'font-black text-xs uppercase',
            'hover:shadow-hard hover:-translate-y-0.5',
            'active:translate-y-0.5 active:shadow-hard-pressed transition-all',
            'bg-neo-lime text-neo-black',
          )}
        >
          <Share2 className="w-3.5 h-3.5 me-1.5" />
          {t('share.emojiCard.share')}
        </Button>
        <Button
          onClick={handleCopy}
          size="sm"
          aria-label={copied ? t('common.copied') : t('share.emojiCard.copy')}
          className={cn(
            'flex-1 py-2.5 bg-neo-navy text-white border-2 rounded-neo shadow-hard-sm',
            'text-xs uppercase',
            'hover:shadow-hard hover:-translate-y-0.5',
            'active:translate-y-0.5 active:shadow-hard-pressed transition-all',
            'border-neo-lime/30',
          )}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 me-1.5 text-neo-lime" />
          ) : (
            <Copy className="w-3.5 h-3.5 me-1.5" />
          )}
          {copied ? t('common.copied') : t('share.emojiCard.copy')}
        </Button>
      </div>
    </AdaptiveMotion.div>
  );
}
