'use client';

import { useEffect, useMemo, useRef } from 'react';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { Button } from '@/components/ui/button';
import ResultsBannerSlot from '@/components/ads/ResultsBannerSlot';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { BlastResultsHero } from '../results/BlastResultsHero';
import { BlastResultsBadges } from '../results/BlastResultsBadges';
import { BlastRunJourney } from '../results/BlastRunJourney';
import { BlastLootRow } from '../results/BlastLootRow';
import { BlastBestWordTiles } from '../results/BlastBestWordTiles';
import { useBlastResultsReveal } from '../results/useBlastResultsReveal';
import { buildRunJourney } from '../results/runJourneyModel';
import { fromSpResults, resolvePassPct, toBlastResultsView, type BlastResultsExtras } from '../results/blastResultsViewModel';
import type { BlastResultsT } from '../results/types';
import { useBlastBadgeUnlocks } from './hooks/useBlastBadgeUnlocks';
import { BlastBragCard } from './BlastBragCard';
import { computeFailReason } from './utils/computeFailReason';
import type { BlastResultsData } from './types';

interface BlastResultsSummaryProps {
  results: BlastResultsData & BlastResultsExtras;
  t: BlastResultsT;
  onPlayAgain: () => void;
  onQuit: () => void;
  onOpenStore?: () => void;
}

export function BlastResultsSummary({ results, t, onPlayAgain, onQuit, onOpenStore }: BlastResultsSummaryProps) {
  const { language, dir } = useLanguage();
  const rootRef = useRef<HTMLDivElement>(null);
  const badges = useBlastBadgeUnlocks({ results, t });
  const view = useMemo(() => toBlastResultsView(fromSpResults(results)), [results]);
  const passPct = resolvePassPct(results);
  const didFail = results.clearPercentage < passPct;
  const journey = useMemo(() => buildRunJourney(results.waveResults ?? [], passPct), [results.waveResults, passPct]);
  const reachedWave = journey.reachedWave || results.wavesCompleted + 1;

  useBlastResultsReveal(rootRef, { score: view.score, locale: language, confetti: view.celebrate.confetti });

  useEffect(() => {
    trackGrowthEvent('results_viewed', { mode: 'blast', score: results.finalScore });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headline =
    didFail && !view.isNewBest && results.wavesCompleted > 0
      ? t('blast.results.runReached', 'Made it to wave {wave}!', { wave: reachedWave })
      : undefined;

  return (
    <div
      ref={rootRef}
      dir={dir}
      className="flex-1 flex flex-col w-full max-w-md lg:max-w-5xl mx-auto min-h-0 bg-neo-navy"
      data-testid="blast-results-summary"
      data-fail={didFail ? 'true' : 'false'}
    >
      <div className="relative flex-1 overflow-y-auto overflow-x-hidden px-4 pt-6 pb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        <div className="w-full flex flex-col items-center gap-4 lg:flex-1">
          <BlastResultsHero
            view={view}
            t={t}
            locale={language}
            headline={headline}
            stars={didFail ? null : { count: results.stars, label: t(`blast.stars${results.stars}`) }}
            footer={didFail ? <FailStrip results={results} passPct={passPct} t={t} /> : null}
          />

          <BlastRunJourney
            journey={journey}
            passPct={passPct}
            tilesCleared={results.tilesCleared}
            totalTiles={results.totalTiles}
            clearPct={results.clearPercentage}
            t={t}
          />
        </div>

        <div className="w-full flex flex-col items-center gap-4 lg:flex-1">
          <BlastLootRow view={view} t={t} locale={language} />
          <BlastBestWordTiles word={view.bestWord} longestWord={view.longestWord} t={t} />
          <BlastResultsBadges badges={badges} t={t} />

          <BlastBragCard results={results} t={t} />
        </div>
      </div>

      <ResultsBannerSlot placement="singleplayer-complete" className="shrink-0" />

      <div
        className="sticky bottom-0 z-20 shrink-0 flex flex-col gap-2 w-full px-4 py-3 bg-neo-navy border-t-3 border-neo-black pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        data-testid="blast-results-cta-footer"
      >
        <Button
          data-testid="play-again-button"
          data-reveal="cta"
          size="lg"
          onClick={onPlayAgain}
          className="min-h-[56px] font-black text-xl uppercase border-3 border-neo-black shadow-hard-lg bg-neo-lime text-neo-black hover:bg-neo-lime/90"
        >
          {didFail ? t('blast.results.tryAgain') : t('blast.playAgain')}
        </Button>
        <div className="flex items-center justify-center gap-1">
          <Button asChild variant="ghost" size="sm" className={SECONDARY}>
            <a href={`/${language}/leaderboard`} data-testid="blast-results-leaderboard-link">{t('nav.leaderboard')}</a>
          </Button>
          {onOpenStore && (
            <Button data-testid="blast-results-upgrades-button" variant="ghost" size="sm" onClick={onOpenStore} className={SECONDARY}>
              {t('blast.store.title', 'Upgrades')}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onQuit} className={SECONDARY}>
            {t('common.home')}
          </Button>
        </div>
      </div>
    </div>
  );
}

const SECONDARY = 'font-semibold text-neo-cyan hover:text-neo-cyan hover:bg-transparent uppercase tracking-wider text-xs';

function FailStrip({ results, passPct, t }: { results: BlastResultsData; passPct: number; t: BlastResultsT }) {
  const reason = computeFailReason({ tilesCleared: results.tilesCleared, totalTiles: results.totalTiles, passPct });
  return (
    <div
      data-testid="blast-results-fail-banner"
      className="-mx-4 -mb-4 mt-4 flex flex-col items-center gap-1 rounded-b-neo border-t-3 border-neo-black bg-neo-navy px-4 py-3"
    >
      <span className="rounded-md border-2 border-neo-black bg-neo-pink px-2 py-0.5 font-neo-display text-[10px] font-black uppercase tracking-widest text-neo-white shadow-hard-sm">
        {t('blast.results.waveFailed')}
      </span>
      <p className="font-neo-display text-lg font-black uppercase leading-tight text-neo-white" data-testid="blast-fail-reason">
        {reason.kind === 'tiles_short'
          ? t('blast.results.tilesShort', { count: reason.tilesShort })
          : t('blast.results.needClearPct', { required: passPct, got: results.clearPercentage })}
      </p>
      <p className="text-[11px] font-bold uppercase tracking-wider text-neo-white/80">
        {t('blast.results.failHintPct', 'Clear at least {required}% of the board to advance', { required: passPct })}
      </p>
    </div>
  );
}

export default BlastResultsSummary;
