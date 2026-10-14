'use client';

import { useCallback, useState } from 'react';
import { m } from 'framer-motion';
import Link from 'next/link';
import { Share2, ChevronRight, Flame, CalendarCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import ResultsBannerSlot from '@/components/ads/ResultsBannerSlot';
import { NextQuestCta } from '@/components/daily/results/NextQuestCta';
import { buildPyramidShareGrid } from '@/lib/connections/pyramid/shareGrid';
import type { PyramidPuzzle } from '@/lib/connections/pyramid/types';
import { gridCallout, type BridgeOutcome } from '@/lib/connections/shareGrid';
import { stripEmoji } from '@/lib/share/stripEmoji';
import type { Language } from '@/types';
import PyramidProgress from './PyramidProgress';
import ConnectionsMascot from '../ConnectionsMascot';
import DailyAnswerKey from '../DailyAnswerKey';

const UNREACHED: BridgeOutcome = { reached: false, solved: false, wrongAttempts: 0, hintUsed: false };

interface Props {
  pyramid: PyramidPuzzle;
  won: boolean;
  score: number;
  gaveUpBase: [boolean, boolean, boolean];
  solvedBridges: string[];
  /** Client day streak — the chip hides at 0. */
  streak: number;
  /** Per-stage outcomes: 3 base stages then the finale. */
  outcomes: readonly BridgeOutcome[];
  dateISO: string;
  sharePath?: string;
  /** Hosted as the day's Word Bridge quest (/connections/daily). */
  daily: boolean;
  /** Re-opened after finishing today. */
  revisit?: boolean;
}

/**
 * The finished pyramid: the tower, the verdict, the answers, share — and the
 * way on. As the daily quest the way on is the next unplayed daily (the old
 * "play the daily" link pointed at the page it was already on); standalone it
 * is the daily quest itself.
 */
export default function PyramidResultCard({
  pyramid,
  won,
  score,
  gaveUpBase,
  solvedBridges,
  streak,
  outcomes,
  dateISO,
  sharePath,
  daily,
  revisit = false,
}: Props) {
  const { t, language } = useLanguage();
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const base = [0, 1, 2].map((i) => outcomes[i] ?? UNREACHED) as [BridgeOutcome, BridgeOutcome, BridgeOutcome];
    const finale = outcomes[3] ?? UNREACHED;
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/${sharePath ?? `${language}/connections/pyramid`}`
        : undefined;
    const text = buildPyramidShareGrid({
      title: t('connections.pyramid.title'),
      dateISO,
      base,
      finale,
      score,
      callout: t(`connections.daily.shareCallout.${gridCallout([...base, finale])}`),
      url,
    });
    try {
      const shareText = stripEmoji(text);
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ text: shareText });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
      }
    } catch {
      /* user cancelled / unsupported */
    }
  }, [t, language, dateISO, score, sharePath, outcomes]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6">
      {revisit && (
        <div
          data-testid="daily-already-played"
          role="status"
          className="flex items-center gap-2 rounded-neo border-neo border-neo-lime bg-neo-lime/10 px-3 py-2 shadow-hard-sm"
        >
          <CalendarCheck className="h-5 w-5 shrink-0 text-neo-lime" strokeWidth={2.5} aria-hidden="true" />
          <p className="font-neo-body text-sm font-bold text-neo-white">{t('connections.daily.alreadyPlayed')}</p>
        </div>
      )}
      <m.div
        initial={revisit ? false : { opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 22 }}
        className={[
          'rounded-neo border-neo-thick bg-neo-navy-light p-5 text-center shadow-hard',
          won ? 'border-neo-lime' : 'border-neo-red',
        ].join(' ')}
      >
        <ConnectionsMascot status={won ? 'won' : 'lost'} className="mb-3 h-24 w-24" />
        <PyramidProgress
          stage={3}
          solvedBridges={solvedBridges}
          gaveUpBase={gaveUpBase}
          metaAnswer={pyramid.metaAnswer}
          won={won}
        />
        <h1 className="mt-4 font-neo-display text-2xl font-black text-neo-white">
          {won ? t('connections.pyramid.won') : t('connections.pyramid.lost')}
        </h1>
        <div className="mt-2 flex items-center justify-center gap-2">
          <span className="font-neo-display text-lg font-black text-neo-white/70">{t('connections.score')}</span>
          <span className="font-neo-display text-xl font-black text-neo-yellow tabular-nums">{score}</span>
          {/* Same streak chip the 5-riddle daily results draw — pyramid days
              advance the same client streak, so it should show it too. */}
          {streak > 0 && (
            <m.span
              data-testid="pyramid-streak-chip"
              initial={revisit ? false : { scale: 0, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.4 }}
              className="inline-flex items-center gap-1 rounded-neo border-neo border-neo-orange bg-neo-orange/10 px-3 py-1 shadow-hard-sm"
            >
              <Flame className="h-4 w-4 text-neo-orange" strokeWidth={2.5} aria-hidden="true" />
              <span className="font-neo-display font-black text-neo-orange">{streak}</span>
            </m.span>
          )}
        </div>
        {!won && (
          <p className="mt-3 font-neo-body text-sm text-neo-white/70">
            {t('connections.pyramid.reveal')}: <span className="font-bold text-neo-white">{pyramid.metaAnswer}</span>
          </p>
        )}
        {/* The 3 base bridges the run passed through — a lost pyramid used to
            reveal only the meta, so a player who burned the base stages left
            without ever learning what those answers were. */}
        <div className="mt-4">
          <DailyAnswerKey
            puzzles={pyramid.base}
            solvedIndices={new Set(pyramid.base.map((_, i) => i).filter((i) => !gaveUpBase[i]))}
            title={t('connections.daily.answerKey')}
            isRTL={language === 'he'}
          />
        </div>
        <m.button
          type="button"
          onClick={handleShare}
          whileTap={{ scale: 0.96 }}
          className="mt-4 inline-flex items-center gap-2 rounded-neo border-neo-thick border-neo-pink bg-neo-pink px-5 py-2.5 font-neo-display font-black text-neo-navy shadow-hard"
        >
          <Share2 className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          {copied ? t('connections.daily.copied') : t('connections.daily.share')}
        </m.button>
      </m.div>

      {daily ? (
        <NextQuestCta
          justFinished="connections"
          currentLanguage={language as Language}
          source="connections_pyramid_daily_results"
        />
      ) : (
        /* The standalone terminal screen was a dead end — route players to the
           daily, which always has something to play. */
        <Link
          href={`/${language}/connections/daily`}
          data-testid="pyramid-back-to-daily"
          className="flex items-center gap-3 rounded-neo border-neo-thick border-neo-cyan bg-neo-cyan/15 p-4 shadow-hard transition-transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <span className="flex min-w-0 flex-1 flex-col text-start">
            <span className="font-neo-display text-base font-black text-neo-cyan">{t('connections.daily.cta')}</span>
            <span className="font-neo-body text-xs text-neo-white/70">{t('connections.daily.questDesc')}</span>
          </span>
          <DirectionalIcon icon={ChevronRight} className="h-5 w-5 shrink-0 text-neo-cyan" />
        </Link>
      )}

      <ResultsBannerSlot placement="daily-complete" />
    </div>
  );
}
