'use client';

import type { ReactNode } from 'react';
import { m } from 'framer-motion';
import Link from 'next/link';
import { Share2, ChevronRight, Flame } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import ResultsBannerSlot from '@/components/ads/ResultsBannerSlot';
import type { PyramidState } from '@/lib/connections/pyramid/gameLogic';
import PyramidProgress from './PyramidProgress';
import ConnectionsMascot from '../ConnectionsMascot';
import DailyAnswerKey from '../DailyAnswerKey';

interface PyramidEndScreenProps {
  state: PyramidState;
  streak: number;
  copied: boolean;
  onShare: () => void;
  progressSlot: ReactNode;
}

/** The standalone pyramid's end screen (/connections/pyramid). The daily host uses PyramidDailyResults. */
export default function PyramidEndScreen({ state, streak, copied, onShare, progressSlot }: PyramidEndScreenProps) {
  const { t, language } = useLanguage();
  const { pyramid } = state;
  const won = state.status === 'won';
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6">
      <m.div
        initial={{ y: 16, scale: 0.96 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 22 }}
        className={[
          'rounded-neo border-neo-thick bg-neo-navy-light p-5 text-center shadow-hard',
          won ? 'border-neo-lime' : 'border-neo-red',
        ].join(' ')}
      >
        <ConnectionsMascot status={state.status} className="mb-3 h-24 w-24" />
        <PyramidProgress
          stage={3}
          solvedBridges={state.solvedBridges}
          gaveUpBase={state.gaveUpBase}
          metaAnswer={pyramid.metaAnswer}
          won={won}
        />
        <h1 className="mt-4 font-neo-display text-2xl font-black text-neo-white">
          {won ? t('connections.pyramid.won') : t('connections.pyramid.lost')}
        </h1>
        <div className="mt-2 flex items-center justify-center gap-2">
          <span className="font-neo-display text-lg font-black text-neo-white/70">{t('connections.score')}</span>
          <span className="font-neo-display text-xl font-black text-neo-yellow tabular-nums">{state.score}</span>
          {streak > 0 && (
            <m.span
              data-testid="pyramid-streak-chip"
              initial={{ scale: 0, rotate: -12 }}
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
        <div className="mt-4">
          <DailyAnswerKey
            puzzles={pyramid.base}
            solvedIndices={new Set(pyramid.base.map((_, i) => i).filter((i) => !state.gaveUpBase[i]))}
            title={t('connections.daily.answerKey')}
            isRTL={language === 'he'}
          />
        </div>
        <m.button
          type="button"
          onClick={onShare}
          whileTap={{ scale: 0.96 }}
          className="mt-4 inline-flex items-center gap-2 rounded-neo border-neo-thick border-neo-pink bg-neo-pink px-5 py-2.5 font-neo-display font-black text-neo-navy shadow-hard"
        >
          <Share2 className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          {copied ? t('connections.daily.copied') : t('connections.daily.share')}
        </m.button>
      </m.div>

      {progressSlot}

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

      <ResultsBannerSlot placement="daily-complete" />
    </div>
  );
}
