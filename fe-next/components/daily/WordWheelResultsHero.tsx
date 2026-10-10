import React, { useCallback, useEffect, useState } from 'react';
import { m, animate as fmAnimate } from 'framer-motion';
import { Check, Copy, Flame, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WHEEL_RANKS, rankProgress, rankThresholds } from '@/lib/wordWheel/rankLadder';
import { buildShareText } from '@/components/shared/gameShareParts';
import { stripEmoji } from '@/lib/share/stripEmoji';

type T = (key: string, params?: Record<string, string | number>) => string;

interface WordWheelResultsHeroProps {
  t: T;
  score: number;
  wordsFound: string[];
  puzzleNumber: number;
  streakDays: number;
  showStreak: boolean;
  formatWord: (word: string) => string;
  onShareClick?: (method: 'native' | 'copy') => void;
  highlights?: React.ReactNode;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

const FILL = { delay: 0.25, duration: 1.2, ease: [0.16, 1, 0.3, 1] } as const;

export default function WordWheelResultsHero({
  t, score, wordsFound, puzzleNumber, streakDays, showStreak, formatWord, onShareClick, highlights,
}: WordWheelResultsHeroProps) {
  const [reduced] = useState(prefersReducedMotion);
  const thresholds = rankThresholds();
  const { index, position } = rankProgress(score, thresholds);
  const last = thresholds.length - 1;
  const rankName = t(`wordWheel.rank.${WHEEL_RANKS[index]}`);
  const longest = wordsFound.reduce((best, w) => (w.length > best.length ? w : best), '');
  const [shown, setShown] = useState(reduced ? score : 0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (reduced || score === 0) { setShown(score); return; }
    const controls = fmAnimate(0, score, { ...FILL, onUpdate: v => setShown(Math.round(v)) });
    return () => controls?.stop?.();
  }, [score, reduced]);

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

  return (
    <section
      data-testid="word-wheel-results-hero"
      data-rank-index={index}
      className="relative z-10 w-full rounded-neo border-3 border-neo-black bg-neo-navy-light shadow-hard-lg overflow-hidden"
    >
      <div className="px-5 pt-5 pb-4 flex flex-col gap-1">
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-neo-lime/80">
          {t('wordWheel.rank.reached')} · #{puzzleNumber}
        </span>
        <m.h2
          data-testid="results-rank-name"
          className="font-neo-display font-black text-4xl sm:text-5xl text-neo-white leading-tight"
          initial={reduced ? false : { scale: 0.7, y: 8 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.1 }}
        >
          {rankName}
        </m.h2>
      </div>

      <div className="relative h-14 mx-5 mb-2">
        <div className="absolute inset-x-5 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-neo-white/15">
          <m.div
            className="absolute inset-y-0 start-0 rounded-full bg-neo-lime shadow-[0_0_12px_rgba(191,255,0,0.6)]"
            initial={reduced ? false : { width: '0%' }}
            animate={{ width: `${position * 100}%` }}
            transition={FILL}
          />
          {thresholds.map((_, i) => (
            <span
              key={i}
              aria-hidden
              className={cn(
                'absolute top-1/2 -translate-y-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2',
                i === last ? 'w-3.5 h-3.5 rounded-[3px]' : 'w-3 h-3 rounded-full',
                i <= index ? 'bg-neo-lime' : 'bg-neo-white/30',
              )}
              style={{ insetInlineStart: `${(i / last) * 100}%` }}
            />
          ))}
          <m.div
            className="absolute top-1/2 start-0 h-0 z-[2]"
            initial={reduced ? false : { width: '0%' }}
            animate={{ width: `${position * 100}%` }}
            transition={FILL}
          >
            <span
              data-testid="results-score-bubble"
              className="absolute end-0 top-1/2 -translate-y-1/2 ltr:translate-x-1/2 rtl:-translate-x-1/2 grid place-items-center min-w-14 h-14 px-2 rounded-full border-[3px] border-neo-black bg-neo-lime text-neo-black font-neo-display font-black text-xl tabular-nums shadow-[3px_3px_0_#000,0_0_20px_rgba(191,255,0,0.55)]"
            >
              {shown}
            </span>
          </m.div>
        </div>
      </div>

      <div className="grid grid-cols-3 border-t-3 border-neo-black">
        <div data-testid="word-wheel-words-stat" className="px-3 py-3 flex flex-col items-center gap-0.5">
          <span className="font-neo-display font-black text-2xl text-neo-lime tabular-nums leading-none">{wordsFound.length}</span>
          <span className="text-[11px] font-bold uppercase tracking-wide text-neo-white/65 text-center">{t('wordWheel.results.wordsFound')}</span>
        </div>
        <div className="px-3 py-3 flex flex-col items-center gap-0.5 border-x-3 border-neo-black min-w-0">
          <span dir="auto" className="font-neo-display font-black text-xl text-neo-white tracking-wide leading-none truncate max-w-full">
            {longest ? formatWord(longest) : '-'}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wide text-neo-white/65">{t('wordWheel.strip.longest')}</span>
        </div>
        {showStreak && streakDays >= 1 ? (
          <div data-testid="word-wheel-streak-chip" className="px-3 py-3 flex flex-col items-center gap-0.5 bg-neo-orange/15">
            <span className="flex items-center gap-1 font-neo-display font-black text-2xl text-neo-orange leading-none tabular-nums">
              <Flame className="w-5 h-5" strokeWidth={2.5} aria-hidden />
              {streakDays}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wide text-neo-white/65 text-center">
              {t('wordWheel.results.streakChip', { count: streakDays })}
            </span>
          </div>
        ) : (
          <div className="px-3 py-3 flex flex-col items-center gap-0.5">
            <span className="font-neo-display font-black text-2xl text-neo-white tabular-nums leading-none">{score}</span>
            <span className="text-[11px] font-bold uppercase tracking-wide text-neo-white/65">{t('wordWheel.scoreLabel')}</span>
          </div>
        )}
      </div>

      {highlights && (
        <div data-testid="results-highlights" className="flex flex-wrap items-center justify-center gap-2 px-3 py-3 border-t-3 border-neo-black">
          {highlights}
        </div>
      )}

      {wordsFound.length > 0 && (
        <div data-testid="word-wheel-share" className="grid grid-cols-[1fr_auto] gap-2 p-3 border-t-3 border-neo-black bg-neo-black/20">
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
      )}
    </section>
  );
}
