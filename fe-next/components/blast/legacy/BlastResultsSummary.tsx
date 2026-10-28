'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Check, X } from 'lucide-react';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { Button } from '@/components/ui/button';
import ResultsBannerSlot from '@/components/ads/ResultsBannerSlot';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { BlastResultsHero } from '../results/BlastResultsHero';
import { BlastStatChips } from '../results/BlastStatChips';
import { BlastNextGoal } from '../results/BlastNextGoal';
import { BlastResultsBadges } from '../results/BlastResultsBadges';
import { useBlastResultsReveal } from '../results/useBlastResultsReveal';
import { fromSpResults, toBlastResultsView, type BlastResultsExtras } from '../results/blastResultsViewModel';
import { useBlastBadgeUnlocks } from './hooks/useBlastBadgeUnlocks';
import { BlastBragCard } from './BlastBragCard';
import { computeFailReason } from './utils/computeFailReason';
import { formatObjectiveLabel } from './utils/blastObjectiveUtils';
import type { BlastResultsData } from './types';

type Translate = (key: string, vars?: Record<string, string | number> | string) => string;

interface BlastResultsSummaryProps {
  results: BlastResultsData & BlastResultsExtras;
  t: Translate;
  onPlayAgain: () => void;
  onQuit: () => void;
  onOpenStore?: () => void;
}

export function BlastResultsSummary({ results, t, onPlayAgain, onQuit, onOpenStore }: BlastResultsSummaryProps) {
  const { language, dir } = useLanguage();
  const rootRef = useRef<HTMLDivElement>(null);
  const badges = useBlastBadgeUnlocks({ results, t });
  const view = useMemo(() => toBlastResultsView(fromSpResults(results)), [results]);
  const passPct = results.passPct ?? 90;
  const didFail = results.clearPercentage < passPct;

  useBlastResultsReveal(rootRef, { score: view.score, locale: language, confetti: view.celebrate.confetti });

  useEffect(() => {
    trackGrowthEvent('results_viewed', { mode: 'blast', score: results.finalScore });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goalRows = (results.finalObjectives ?? []).filter((p) => p.objective.type !== 'clear_percent');
  const failReason = computeFailReason({ tilesCleared: results.tilesCleared, totalTiles: results.totalTiles, passPct: results.passPct });

  return (
    <div
      ref={rootRef}
      dir={dir}
      className="flex-1 flex flex-col w-full max-w-md lg:max-w-4xl mx-auto min-h-0 bg-neo-navy"
      data-testid="blast-results-summary"
      data-fail={didFail ? 'true' : 'false'}
    >
      <div className="relative flex-1 overflow-y-auto overflow-x-hidden px-4 pt-6 pb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        <div className="w-full flex flex-col items-center gap-4 lg:flex-1">
          <BlastResultsHero
            view={view}
            t={t}
            locale={language}
            headline={didFail ? t('blast.results.waveFailed') : undefined}
            stars={didFail ? null : { count: results.stars, label: t(`blast.stars${results.stars}`) }}
            subline={
              <>
                {results.wordsFound.length} {t('blast.wordsFound')} &middot; {results.wavesCompleted} {t('blast.waves')}
              </>
            }
            footer={<ClearMeter results={results} t={t} />}
          />

          <BlastNextGoal view={view} t={t} locale={language} />

          {didFail && (
            <div
              className="w-full flex flex-col items-center gap-1 px-4 py-3 rounded-neo border-3 border-neo-black shadow-hard bg-neo-red text-neo-white"
              data-testid="blast-results-fail-banner"
            >
              <p className="font-neo-display font-black uppercase tracking-wider text-sm" data-testid="blast-fail-reason">
                {failReason.kind === 'tiles_short'
                  ? t('blast.results.tilesShort', { count: failReason.tilesShort })
                  : t('blast.results.needClearPct', { required: passPct, got: results.clearPercentage })}
              </p>
              <p className="text-[11px] uppercase tracking-wider font-bold">{t('blast.results.failHint')}</p>
              {results.targetWord && !results.targetWordFound && (
                <p data-testid="blast-target-word-missed" className="mt-1 text-[11px] uppercase tracking-wider font-bold">
                  {t('blast.objective.targetWordMissed', { word: results.targetWord })}
                </p>
              )}
            </div>
          )}

          {!didFail && results.targetWord && (
            results.targetWordFound ? (
              <div
                data-testid="blast-target-word-found"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-neo border-3 border-neo-black shadow-hard bg-neo-lime text-neo-black font-neo-display font-black uppercase tracking-wider text-xs"
              >
                {t('blast.objective.targetWordFoundIt')} {results.targetWord}
              </div>
            ) : (
              <div
                data-testid="blast-target-word-cascade-credit"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-neo border-2 border-neo-black bg-neo-navy-light text-neo-white font-neo-body font-bold text-xs"
              >
                {t('blast.objective.targetWordMissed', { word: results.targetWord })}
              </div>
            )
          )}
        </div>

        <div className="w-full flex flex-col items-center gap-4 lg:flex-1 lg:pt-10">
          <BlastStatChips view={view} t={t} locale={language} />

          {goalRows.length > 0 && (
            <div
              data-testid="blast-objective-summary"
              className="w-full rounded-neo border-2 border-neo-black bg-neo-navy-light px-3 py-2 flex flex-col gap-1"
            >
              {goalRows.map((p, i) => (
                <div
                  key={`obj-${p.objective.type}-${i}`}
                  data-testid="blast-objective-summary-row"
                  dir="auto"
                  className={cn('flex items-center gap-2 text-xs font-bold', p.isComplete ? 'text-neo-lime' : 'text-neo-white/60')}
                >
                  {p.isComplete
                    ? <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} />
                    : <X className="h-3.5 w-3.5 shrink-0" strokeWidth={3} />}
                  <span className={cn('flex-1 truncate text-start', p.isComplete && 'line-through')}>
                    {formatObjectiveLabel(p.objective, t)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <BlastBragCard results={results} t={t} />
          <BlastResultsBadges badges={badges} t={t} />
        </div>
      </div>

      <ResultsBannerSlot placement="singleplayer-complete" className="shrink-0" />

      <div
        className="shrink-0 flex flex-col gap-2 w-full px-4 py-3 bg-neo-navy border-t-3 border-neo-black pb-[max(0.75rem,env(safe-area-inset-bottom))]"
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

function ClearMeter({ results, t }: { results: BlastResultsData; t: Translate }) {
  const pct = results.clearPercentage;
  return (
    <div className="mt-3 pt-3 border-t-2 border-neo-black/60">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[10px] uppercase tracking-wider font-bold text-neo-white">{t('blast.results.tilesCleared')}</span>
        <bdi className="text-[11px] font-black text-neo-cyan tabular-nums">
          {results.tilesCleared}/{results.totalTiles} &middot; {pct}%
        </bdi>
      </div>
      <div className="w-full h-2 bg-neo-navy rounded-full overflow-hidden border-2 border-neo-black">
        <div
          className={cn('h-full rounded-full', pct >= (results.passPct ?? 90) ? 'bg-neo-lime' : pct >= 60 ? 'bg-neo-cyan' : 'bg-neo-pink')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default BlastResultsSummary;
