'use client';

import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, Crosshair, Star, Swords, TrendingUp, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import useReducedMotion from '@/hooks/useReducedMotion';
import { useHeroCheer } from '@/lib/quickPlay/useHeroCheer';
import { ResultsAvatarStage, type ResultsAvatar } from '@/components/results/stage/ResultsAvatarStage';
import { BLAST_RESULT_ASSETS, TIER_THEME } from './blastResultsTheme';
import type { BlastResultsView } from './blastResultsViewModel';
import type { BlastTranslate } from './types';
import styles from './results.module.css';

interface BlastResultsHeroProps {
  view: BlastResultsView;
  t: BlastTranslate;
  locale: string;
  headline?: string;
  subline?: ReactNode;
  footer?: ReactNode;
  stars?: { count: 1 | 2 | 3; label: string } | null;
  avatar: ResultsAvatar;
}

const BLAST_ACCENT = '#ff4d9a';

export function BlastResultsHero({ view, t, locale, headline, subline, footer, stars, avatar }: BlastResultsHeroProps) {
  const theme = TIER_THEME[view.tier];
  const showMedal = view.tier === 'high' || view.tier === 'newBest';
  const animate = !useReducedMotion();
  // A wave-1 bust is the one outcome that does not cheer; reaching later waves reads as progress.
  const cheering = view.tier !== 'low';
  const mood = useHeroCheer(cheering, animate);
  const bigMoment = view.tier === 'newBest' || view.tier === 'high';

  return (
    <div
      className="relative w-full flex flex-col items-center"
      data-testid="blast-results-hero"
      data-tier={view.tier}
      data-cheering={cheering ? 'true' : 'false'}
    >
      <ResultsAvatarStage
        avatar={avatar}
        mood={mood}
        accentHex={BLAST_ACCENT}
        animate={animate}
        cheering={view.celebrate.confetti}
        confettiCount={bigMoment ? 16 : 10}
        hopping={animate && bigMoment && mood === 'win'}
      />

      <h2
        className="relative z-10 text-center font-neo-display text-[32px] font-bold leading-tight text-neo-yellow [text-shadow:0_3px_0_#000] lg:text-5xl"
      >
        {headline ?? t(theme.headlineKey)}
      </h2>

      {stars && (
        <div className="relative z-10 mt-1 flex flex-col items-center gap-0.5" data-testid="blast-results-stars">
          <div className="flex gap-1" dir="ltr">
            {[1, 2, 3].map((n) => (
              <Star
                key={n}
                data-reveal="star"
                className={cn(
                  'h-8 w-8 drop-shadow-[2px_2px_0_rgb(var(--neo-black))]',
                  n <= stars.count ? 'fill-neo-yellow text-neo-yellow' : 'text-neo-white/40',
                )}
                strokeWidth={2.5}
              />
            ))}
          </div>
          <span className="-rotate-1 rounded-xl border-[3px] border-black bg-neo-black px-3 py-0.5 font-neo-display text-xs font-bold uppercase tracking-wide text-neo-yellow shadow-hard">{stars.label}</span>
        </div>
      )}

      <div
        data-reveal="hero-card"
        data-testid="blast-results-score-card"
        className={cn(
          'relative z-10 mt-4 w-full rounded-2xl border-[3px] border-black bg-neo-navy-elevated px-4 pb-4 pt-5 text-center shadow-hard-lg animate-[qp-card-in_0.42s_cubic-bezier(0.34,1.4,0.64,1)_0.25s_both] motion-reduce:animate-none',
        )}
      >
        {showMedal && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={BLAST_RESULT_ASSETS.medal}
            alt=""
            aria-hidden="true"
            data-reveal="medal"
            className="absolute -top-7 end-3 h-16 w-16 object-contain"
          />
        )}

        {view.isNewBest && (
          // A CSS stamp, not a timeline step: the saved best can land after the reveal has played.
          <div
            data-testid="blast-results-new-best"
            className={cn(
              'absolute -top-4 start-3 rounded-neo border-3 border-neo-black bg-neo-yellow px-3 py-1 font-neo-display text-xs font-black uppercase tracking-wider text-neo-black shadow-hard',
              styles.stamp,
            )}
          >
            {t('blast.results.newRecord')}
          </div>
        )}

        <p
          data-reveal="score"
          className="font-neo-display text-6xl font-black tabular-nums text-neo-yellow [text-shadow:3px_3px_0_rgb(var(--neo-black))]"
          dir="ltr"
        >
          {safeToLocaleString(view.score, locale)}
        </p>

        {subline && (
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-neo-white">{subline}</p>
        )}

        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {view.pbDelta != null && (
            <span className="inline-flex items-center gap-1 text-sm font-black text-neo-lime">
              <TrendingUp className="h-4 w-4" strokeWidth={2.75} />
              {t('blast.results.pbDelta', { delta: safeToLocaleString(view.pbDelta, locale) })}
            </span>
          )}
          {view.rank && <RankChip rank={view.rank} t={t} />}
        </div>

        <GoalLine view={view} t={t} locale={locale} />

        {footer}
      </div>
    </div>
  );
}

function GoalLine({ view, t, locale }: { view: BlastResultsView; t: BlastTranslate; locale: string }) {
  const goal = view.nextGoal;
  if (!goal) return null;
  const gap = safeToLocaleString(goal.gap, locale);
  const text =
    goal.kind === 'rival'
      ? t('blast.results.reveal.goalRival', { gap, name: goal.name })
      : goal.kind === 'lead'
        ? t('blast.results.reveal.goalLead', { gap, name: goal.name })
        : t('blast.results.reveal.goalBest', { gap });
  const Icon = goal.kind === 'lead' ? Trophy : goal.kind === 'rival' ? Swords : Crosshair;
  const progress = goal.kind === 'lead' ? 100 : Math.max(4, Math.round((view.score / (view.score + goal.gap)) * 100));

  return (
    <div data-testid="blast-results-next-goal" data-kind={goal.kind} className="mx-auto mt-3 w-full max-w-xs">
      <div className="flex items-center justify-center gap-1.5 text-neo-white">
        <Icon className="h-4 w-4 shrink-0 text-neo-yellow" strokeWidth={2.75} aria-hidden="true" />
        <p className="text-sm font-black" dir="auto">{text}</p>
        {view.nearMiss && (
          <span
            data-testid="blast-results-near-miss"
            className="shrink-0 -rotate-3 rounded-neo border-2 border-neo-black bg-neo-pink px-1.5 py-0.5 font-neo-display text-[10px] font-black uppercase text-neo-white"
          >
            {t('blast.results.reveal.nearMiss')}
          </span>
        )}
      </div>
      {goal.kind !== 'lead' && (
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full border-2 border-neo-black bg-neo-navy">
          <div
            className={cn('h-full origin-left rtl:origin-right', view.nearMiss ? 'bg-neo-pink' : 'bg-neo-yellow')}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

function RankChip({ rank, t }: { rank: NonNullable<BlastResultsView['rank']>; t: BlastTranslate }) {
  const up = rank.delta != null && rank.delta > 0;
  const down = rank.delta != null && rank.delta < 0;
  return (
    <span
      data-testid="blast-results-rank"
      className="inline-flex items-center gap-1.5 rounded-neo border-2 border-neo-black bg-neo-navy px-2 py-0.5 text-xs font-black uppercase text-neo-white shadow-hard-sm"
    >
      {t('blast.results.reveal.rank')}
      <bdi className="tabular-nums text-neo-cyan">
        #{rank.current}
        {rank.total ? ` / ${rank.total}` : ''}
      </bdi>
      {up && (
        <span className="inline-flex items-center text-neo-lime">
          <ArrowUp className="h-3 w-3" strokeWidth={3} />
          {t('blast.results.reveal.rankUp', { n: rank.delta! })}
        </span>
      )}
      {down && (
        <span className="inline-flex items-center text-neo-pink">
          <ArrowDown className="h-3 w-3" strokeWidth={3} />
          {t('blast.results.reveal.rankDown', { n: Math.abs(rank.delta!) })}
        </span>
      )}
    </span>
  );
}
