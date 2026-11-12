'use client';

import { ResultsSocialSlot } from '@/components/results/ResultsSocialSlot';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getOrCreateStoredCustomAvatar } from '@/utils/profileStorage';
import { Home, RotateCcw } from 'lucide-react';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { ResultsNextBar } from '@/components/results/stage/ResultsNextBar';
import { Button } from '@/components/ui/button';
import ResultsBannerSlot from '@/components/ads/ResultsBannerSlot';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { BlastResultsHero } from '../results/BlastResultsHero';
import { BlastResultsBadges } from '../results/BlastResultsBadges';
import { BlastRunJourney } from '../results/BlastRunJourney';
import { BlastLootRow } from '../results/BlastLootRow';
import { BlastGemHaul } from '../results/BlastGemHaul';
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
  const { user, profile } = useAuth();
  const [guestAvatar] = useState(() => (user ? null : getOrCreateStoredCustomAvatar()));
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
      <div className="relative flex-1 overflow-y-auto overflow-x-hidden px-4 pt-2 pb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        <div className="w-full flex flex-col items-center gap-4 lg:flex-1">
          <BlastResultsHero
            view={view}
            t={t}
            locale={language}
            headline={headline}
            stars={didFail ? null : { count: results.stars, label: t(`blast.stars${results.stars}`) }}
            footer={didFail ? <FailStrip results={results} passPct={passPct} t={t} /> : null}
            avatar={{ userId: user?.id ?? 'guest', customAvatar: profile?.avatar_config ?? guestAvatar }}
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
          <ResultsSocialSlot mode="blast" score={view.score} previousBest={fromSpResults(results).personalBest} xp={user ? results.xp : null} />
          <BlastGemHaul gems={view.gems.byKind ?? undefined} total={view.gems.total} t={t} />
          <BlastLootRow view={view} t={t} locale={language} />
          <BlastBestWordTiles word={view.bestWord} longestWord={view.longestWord} t={t} />
          <BlastResultsBadges badges={badges} t={t} />

          <BlastBragCard results={results} t={t} />

          <div className="flex w-full items-center justify-center gap-2">
            <Button asChild variant="ghost" size="sm" className={SECONDARY}>
              <a href={`/${language}/leaderboard`} data-testid="blast-results-leaderboard-link">{t('nav.leaderboard')}</a>
            </Button>
            {onOpenStore && (
              <Button data-testid="blast-results-upgrades-button" variant="ghost" size="sm" onClick={onOpenStore} className={SECONDARY}>
                {t('blast.store.title', 'Upgrades')}
              </Button>
            )}
          </div>
        </div>
      </div>

      <ResultsBannerSlot placement="singleplayer-complete" className="shrink-0" />

      <div className="sticky bottom-0 z-20 shrink-0" data-testid="blast-results-cta-footer">
        <ResultsNextBar
          shine
          primary={{
            label: didFail ? t('blast.results.tryAgain') : t('blast.playAgain'),
            onClick: onPlayAgain,
            testId: 'play-again-button',
            icon: <RotateCcw className="h-5 w-5" strokeWidth={3} />,
          }}
          secondary={{
            label: t('common.home'),
            onClick: onQuit,
            testId: 'blast-results-home-button',
            icon: <Home className="h-6 w-6" strokeWidth={2.5} aria-hidden="true" />,
          }}
        />
      </div>
    </div>
  );
}

const SECONDARY = 'h-11 rounded-xl border-[3px] border-black bg-neo-navy-elevated px-4 font-neo-display font-bold text-neo-cyan shadow-hard-sm hover:bg-neo-navy-elevated hover:text-neo-cyan uppercase tracking-wider text-xs';

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
          ? (reason.tilesShort === 1 ? t('blast.results.tilesShortOne') : t('blast.results.tilesShort', { count: reason.tilesShort }))
          : t('blast.results.needClearPct', { required: passPct, got: results.clearPercentage })}
      </p>
      <p className="text-[11px] font-bold uppercase tracking-wider text-neo-white/80">
        {t('blast.results.failHintPct', 'Clear at least {required}% of the board to advance', { required: passPct })}
      </p>
    </div>
  );
}

export default BlastResultsSummary;
