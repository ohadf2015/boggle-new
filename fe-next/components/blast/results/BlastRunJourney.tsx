'use client';

import { Fragment } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getWaveTheme } from '../legacy/utils/blastWaveConfig';
import { THEME_ICON, accentColor } from '../progress/waveTheme';
import type { JourneyNode, RunJourney } from './runJourneyModel';
import type { BlastResultsT } from './types';
import styles from './results.module.css';

interface BlastRunJourneyProps {
  journey: RunJourney;
  passPct: number;
  tilesCleared: number;
  totalTiles: number;
  clearPct: number;
  t: BlastResultsT;
}

/** The "you advanced" beat: every wave of this run on a track, the next boss ahead, and the final wave's clear meter. */
export function BlastRunJourney({ journey, passPct, tilesCleared, totalTiles, clearPct, t }: BlastRunJourneyProps) {
  if (journey.nodes.length === 0) return <ClearMeter passPct={passPct} tilesCleared={tilesCleared} totalTiles={totalTiles} clearPct={clearPct} t={t} />;
  const { milestone } = journey;
  const lastCleared = journey.nodes[journey.nodes.length - 1].status === 'cleared';

  return (
    <section
      data-testid="blast-results-journey"
      data-reveal="journey"
      className="w-full rounded-neo border-3 border-neo-black bg-neo-navy-light px-3 pb-3 pt-2.5 shadow-hard tv:px-6 tv:pb-6"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-neo-display text-xs font-black uppercase tracking-[0.18em] text-neo-white tv:text-lg">
          {t('blast.results.journey.title', 'Your run')}
        </h3>
        {journey.runStars > 0 && (
          <span
            data-testid="blast-journey-stars"
            className="inline-flex items-center gap-1 rounded-md border-2 border-neo-black bg-neo-yellow px-1.5 py-0.5 font-neo-display text-xs font-black tabular-nums text-neo-black shadow-hard-sm tv:text-base"
            aria-label={t('blast.results.journey.stars', '{count} stars earned', { count: journey.runStars })}
          >
            <Star className="h-3.5 w-3.5" fill="currentColor" strokeWidth={2.5} aria-hidden="true" />
            <bdi>{journey.runStars}</bdi>
          </span>
        )}
      </div>

      <ol className="mt-3 flex items-start" aria-label={t('blast.results.journey.title', 'Your run')}>
        {journey.hiddenBefore > 0 && (
          <li className="flex h-10 shrink-0 items-center pe-1 font-neo-display text-xs font-black text-neo-white/70 tv:h-14 tv:text-base" aria-hidden="true">
            <bdi>+{journey.hiddenBefore}</bdi>
          </li>
        )}
        {journey.nodes.map((node, i) => (
          <Fragment key={node.wave}>
            {i > 0 && <Link done={node.status === 'cleared' || journey.nodes[i - 1].status === 'cleared'} />}
            <WaveNode node={node} t={t} />
          </Fragment>
        ))}
        {milestone && (
          <>
            <li aria-hidden="true" className={cn('mt-[18px] h-1 min-w-3 flex-1 rounded-full tv:mt-[26px]', styles.milestoneDash)} />
            <MilestoneNode milestone={milestone} reachedIsCleared={lastCleared} t={t} />
          </>
        )}
      </ol>

      <ClearMeter passPct={passPct} tilesCleared={tilesCleared} totalTiles={totalTiles} clearPct={clearPct} t={t} inset />
    </section>
  );
}

function Link({ done }: { done: boolean }) {
  return (
    <li
      aria-hidden="true"
      className={cn(
        'mt-[17px] h-1.5 min-w-2 flex-1 rounded-full border border-neo-black tv:mt-[25px]',
        done ? 'bg-neo-lime' : 'bg-neo-navy',
      )}
    />
  );
}

function WaveNode({ node, t }: { node: JourneyNode; t: BlastResultsT }) {
  const theme = getWaveTheme(node.wave);
  const Icon = THEME_ICON[node.themeId];
  const accent = accentColor(theme);
  const cleared = node.status === 'cleared';

  return (
    <li
      data-testid="blast-journey-node"
      data-reveal="node"
      data-wave={node.wave}
      data-status={node.status}
      aria-label={t('blast.results.wave', { n: node.wave })}
      className="flex shrink-0 flex-col items-center gap-1"
    >
      <span
        className={cn(
          'relative flex h-10 w-10 flex-col items-center justify-center rounded-neo border-3 font-neo-display font-black leading-none tabular-nums tv:h-14 tv:w-14',
          cleared ? 'border-neo-black text-neo-black shadow-hard-sm' : 'border-neo-pink bg-neo-navy text-neo-white',
        )}
        style={cleared ? { backgroundColor: accent } : undefined}
      >
        {!cleared && <span aria-hidden="true" className={styles.reachedRing} />}
        <Icon className="h-3 w-3 tv:h-4 tv:w-4" strokeWidth={3} aria-hidden="true" />
        <bdi className="text-sm tv:text-xl">{node.wave}</bdi>
      </span>
      {cleared ? (
        <span className="flex gap-px" dir="ltr" aria-hidden="true">
          {[1, 2, 3].map((n) => (
            <Star
              key={n}
              className={cn('h-2.5 w-2.5 tv:h-3.5 tv:w-3.5', n <= node.stars ? 'text-neo-yellow' : 'text-neo-white/25')}
              fill="currentColor"
              strokeWidth={2}
            />
          ))}
        </span>
      ) : (
        <span className="font-neo-display text-[9px] font-black uppercase tracking-wider text-neo-pink tv:text-xs">
          {t('blast.results.journey.here', 'You')}
        </span>
      )}
    </li>
  );
}

function MilestoneNode({
  milestone, reachedIsCleared, t,
}: { milestone: NonNullable<RunJourney['milestone']>; reachedIsCleared: boolean; t: BlastResultsT }) {
  const theme = getWaveTheme(milestone.wave);
  const Icon = THEME_ICON[milestone.themeId];
  const accent = accentColor(theme);
  const away = reachedIsCleared ? milestone.wavesAway - 1 : milestone.wavesAway;

  return (
    <li
      data-testid="blast-journey-milestone"
      data-reveal="node"
      data-wave={milestone.wave}
      className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1 text-center tv:w-28"
    >
      <span
        className="flex h-10 w-10 flex-col items-center justify-center rounded-neo border-3 border-dashed bg-neo-navy font-neo-display font-black leading-none tabular-nums tv:h-14 tv:w-14"
        style={{ borderColor: accent, color: accent }}
      >
        <Icon className="h-4 w-4 tv:h-5 tv:w-5" strokeWidth={3} aria-hidden="true" />
        <bdi className="text-xs tv:text-lg">{milestone.wave}</bdi>
      </span>
      <span className="font-neo-display text-[9px] font-black uppercase leading-tight tracking-wide tv:text-xs" style={{ color: accent }}>
        {t(theme.nameKey)}
      </span>
      <span className="text-[9px] font-bold leading-tight text-neo-white/80 tv:text-xs">
        {away <= 0
          ? t('blast.results.journey.upNext', 'Up next')
          : t('blast.results.journey.wavesAway', '{count} waves away', { count: away })}
      </span>
    </li>
  );
}

interface ClearMeterProps {
  passPct: number;
  tilesCleared: number;
  totalTiles: number;
  clearPct: number;
  t: BlastResultsT;
  inset?: boolean;
}

function ClearMeter({ passPct, tilesCleared, totalTiles, clearPct, t, inset }: ClearMeterProps) {
  const pct = Math.max(0, Math.min(100, clearPct));
  const passed = pct >= passPct;
  return (
    <div
      data-testid="blast-results-clear-meter"
      data-pass={passPct}
      className={cn(
        'w-full',
        inset ? 'mt-3 border-t-2 border-neo-black/60 pt-3' : 'rounded-neo border-3 border-neo-black bg-neo-navy-light p-3 shadow-hard',
      )}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span data-testid="blast-results-goal" className="font-neo-display text-xs font-black uppercase tracking-wide text-neo-yellow tv:text-lg">
          {t('blast.objective.clearPercent', { target: passPct })}
        </span>
        <bdi className="text-[11px] font-black tabular-nums text-neo-cyan tv:text-base">
          {tilesCleared}/{totalTiles} &middot; {pct}%
        </bdi>
      </div>
      <div className="relative">
        <div className="h-3 w-full overflow-hidden rounded-full border-2 border-neo-black bg-neo-navy tv:h-4">
          <div
            data-reveal="meter"
            className={cn('h-full origin-left rounded-full rtl:origin-right', passed ? 'bg-neo-lime' : 'bg-neo-pink')}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span
          aria-hidden="true"
          data-testid="blast-results-pass-mark"
          className="absolute -top-1 h-5 w-1 -translate-x-1/2 rounded-sm bg-neo-yellow shadow-hard-sm rtl:translate-x-1/2 tv:h-6"
          style={{ insetInlineStart: `${passPct}%` }}
        />
      </div>
      <p className="mt-1.5 text-end text-[10px] font-bold uppercase tracking-wider text-neo-white tv:text-sm">
        {t('blast.results.tilesCleared')}
      </p>
    </div>
  );
}
