'use client';

/**
 * BlastResultsSummary — post-game results screen for Blast Mode.
 *
 * Renders the final score, percentile rank band, PB delta, best-moment card,
 * achievement ribbon, and CTAs. Pure presentational component — owns no
 * mutable state other than the badge-unlock side effect (delegated to
 * `useBlastBadgeUnlocks`).
 *
 * Sections render conditionally on data availability so the component is
 * resilient while the `saveBlastResult` round-trip is in flight:
 *  - Score card always shows immediately
 *  - Percentile band fades in once `results.percentile != null`
 *  - PB delta only when `previousBest` exists AND was beaten
 *
 * Iconography: lucide-react only (no emoji). Badge icon names come from the
 * registry as strings; we resolve them through a local lookup map so the
 * registry stays serializable.
 */

import { type ComponentType } from 'react';
import {
  Trophy, Star, Sparkles, Waves, Flag, Link as LinkIcon, Crown,
  BookOpen, Target, TrendingUp, Award, Zap,
} from 'lucide-react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useBlastBadgeUnlocks } from './hooks/useBlastBadgeUnlocks';
import { BlastBragCard } from './BlastBragCard';
import { getMascotForResults, MASCOT_IMAGES } from './utils/blastMascot';
import type { BlastResultsData } from './types';

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>;

/** Resolves the string icon names stored in `blastBadges.ts` to components. */
const BADGE_ICONS: Record<string, IconType> = {
  Sparkles, Waves, Flag, Link: LinkIcon, Crown, BookOpen, Target, Trophy,
};

interface BlastResultsSummaryProps {
  results: BlastResultsData;
  t: (key: string, vars?: Record<string, string | number> | string) => string;
  onPlayAgain: () => void;
  onQuit: () => void;
}

export function BlastResultsSummary({
  results, t, onPlayAgain, onQuit,
}: BlastResultsSummaryProps) {
  // Side-effect: persist + toast new badges. Returns enriched list w/ isNew flag.
  const badges = useBlastBadgeUnlocks({ results, t });

  // Pure selector: results → mascot key → public asset path.
  const mascotKey = getMascotForResults(results);
  const mascotSrc = MASCOT_IMAGES[mascotKey];

  const pbDelta =
    results.previousBest != null && results.finalScore > results.previousBest
      ? results.finalScore - results.previousBest
      : null;
  const isNewRecord = pbDelta != null;
  const bestWave = results.bestWave
    ?? (results.waveResults.length > 0
      ? results.waveResults.reduce((a, b) => (b.score > a.score ? b : a))
      : null);

  return (
    <div
      className="flex-1 flex flex-col items-center justify-start gap-4 px-4 py-6 overflow-y-auto w-full max-w-md mx-auto"
      data-testid="blast-results-summary"
    >
      {/* Mascot — expression reacts to run outcome via pure selector */}
      <AdaptiveMotion.div
        initial={{ scale: 0, rotate: -10, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 18 }}
        className="relative w-24 h-24 rounded-neo border-3 border-neo-black shadow-hard-lg overflow-hidden bg-neo-navy-light"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mascotSrc}
          alt={t(`blast.mascot.${mascotKey}`)}
          data-testid="blast-results-mascot"
          data-mascot-key={mascotKey}
          className="w-full h-full object-cover"
        />
      </AdaptiveMotion.div>

      {/* Header */}
      <AdaptiveMotion.h2
        initial={{ scale: 0.6, opacity: 0, y: -10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
        className="text-3xl font-black uppercase text-neo-pink font-neo-display tracking-wider drop-shadow-[3px_3px_0_#000]"
      >
        {t('blast.gameOver')}
      </AdaptiveMotion.h2>

      {/* Score card */}
      <AdaptiveMotion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.05 }}
        className={cn(
          'w-full rounded-neo border-3 border-neo-black shadow-hard-lg p-5 text-center',
          'bg-linear-to-br from-neo-navy-light via-neo-navy to-neo-navy-light',
        )}
        data-testid="blast-results-score-card"
      >
        {isNewRecord && (
          <AdaptiveMotion.div
            initial={{ scale: 0, rotate: -8 }}
            animate={{ scale: 1, rotate: -4 }}
            transition={{ type: 'spring', stiffness: 380, damping: 14, delay: 0.4 }}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 mb-2',
              'rounded-neo border-3 border-neo-black shadow-hard',
              'bg-linear-to-r from-neo-lime via-yellow-300 to-neo-lime',
              'font-neo-display font-black uppercase tracking-wider text-xs text-neo-black',
            )}
          >
            <Sparkles className="w-3.5 h-3.5" strokeWidth={2.75} />
            {t('blast.results.newRecord')}
          </AdaptiveMotion.div>
        )}
        <p className="text-6xl font-black text-white tabular-nums font-neo-display drop-shadow-[2px_2px_0_#000]">
          {results.finalScore.toLocaleString()}
        </p>
        <p className="text-xs uppercase tracking-widest text-white/50 mt-1 font-bold">
          {results.wordsFound.length} {t('blast.wordsFound')} &middot;{' '}
          {results.wavesCompleted} {t('blast.waves')}
        </p>
        {pbDelta != null && (
          <p className="mt-2 text-sm font-black text-neo-lime tabular-nums flex items-center justify-center gap-1">
            <TrendingUp className="w-4 h-4" strokeWidth={2.75} />
            {t('blast.results.pbDelta', { delta: pbDelta.toLocaleString() })}
          </p>
        )}
      </AdaptiveMotion.div>

      {/* Brag card — richer comparison + share CTA. Self-hides until backend responds. */}
      <BlastBragCard results={results} t={t} />

      {/* Best-moment card: best wave + biggest combo + best word */}
      <AdaptiveMotion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.15 }}
        className={cn(
          'w-full grid grid-cols-3 gap-2 p-3',
          'rounded-neo border-3 border-neo-black shadow-hard',
          'bg-neo-navy-light',
        )}
        data-testid="blast-results-moments"
      >
        {bestWave && (
          <BestMomentCell
            icon={Award}
            label={t('blast.results.bestWave')}
            value={t('blast.results.wave', { n: String(bestWave.waveNumber) })}
            sub={`${bestWave.score.toLocaleString()}`}
            tint="text-neo-lime"
          />
        )}
        <BestMomentCell
          icon={Zap}
          label={t('blast.results.biggestCombo')}
          value={`x${results.maxCombo}`}
          tint="text-neo-pink"
        />
        {results.bestWord && (
          <BestMomentCell
            icon={Star}
            label={t('blast.results.bestWord')}
            value={results.bestWord.toUpperCase()}
            tint="text-neo-cyan"
          />
        )}
      </AdaptiveMotion.div>

      {/* Achievement ribbon */}
      {badges.length > 0 && (
        <AdaptiveMotion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="w-full"
          data-testid="blast-results-badges"
        >
          <p className="text-[10px] uppercase tracking-widest font-bold text-white/60 mb-2 px-1">
            {t('blast.results.badgesEarned')}
          </p>
          <TooltipProvider delayDuration={150}>
            <div className="flex flex-wrap gap-2">
              {badges.map((badge, i) => {
                const Icon = BADGE_ICONS[badge.icon] ?? Sparkles;
                return (
                  <Tooltip key={badge.id}>
                    <TooltipTrigger asChild>
                      <AdaptiveMotion.button
                        type="button"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{
                          type: 'spring', stiffness: 380, damping: 16,
                          delay: 0.3 + i * 0.08,
                        }}
                        className={cn(
                          'relative flex items-center gap-1.5 px-3 py-2 cursor-help',
                          'rounded-neo border-3 border-neo-black shadow-hard',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-neo-pink',
                          badge.isNew
                            ? 'bg-linear-to-r from-neo-lime via-yellow-300 to-neo-lime'
                            : 'bg-neo-navy text-white',
                        )}
                        data-testid={`blast-badge-${badge.id}`}
                        aria-label={`${badge.label}: ${badge.desc}`}
                      >
                        <Icon
                          className={cn(
                            'w-4 h-4 shrink-0',
                            badge.isNew ? 'text-neo-black' : 'text-neo-lime',
                          )}
                          strokeWidth={2.75}
                        />
                        <span
                          className={cn(
                            'font-neo-display font-black uppercase tracking-wide text-[11px]',
                            badge.isNew ? 'text-neo-black' : 'text-white',
                          )}
                        >
                          {badge.label}
                        </span>
                        {badge.isNew && (
                          <AdaptiveMotion.span
                            initial={{ scale: 0, rotate: -8 }}
                            animate={{ scale: 1, rotate: -8 }}
                            transition={{
                              type: 'spring', stiffness: 380, damping: 14,
                              delay: 0.5 + i * 0.08,
                            }}
                            className={cn(
                              'absolute -top-2 -right-2 px-1.5 py-0.5',
                              'rounded border-2 border-neo-black bg-neo-pink text-white',
                              'font-neo-display font-black text-[8px] uppercase tracking-wider',
                              'shadow-hard-sm',
                            )}
                          >
                            {t('blast.results.newBadge')}
                          </AdaptiveMotion.span>
                        )}
                      </AdaptiveMotion.button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="max-w-[220px] text-center"
                      data-testid={`blast-badge-tooltip-${badge.id}`}
                    >
                      <p className="font-neo-display font-black uppercase text-[11px] text-neo-pink">
                        {badge.label}
                      </p>
                      <p className="text-xs mt-0.5">{badge.desc}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        </AdaptiveMotion.div>
      )}

      {/* CTAs */}
      <AdaptiveMotion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col gap-3 w-full mt-2"
      >
        <Button
          data-testid="play-again-button"
          size="lg"
          onClick={onPlayAgain}
          className="min-h-[56px] font-black text-xl uppercase border-3 border-neo-black shadow-hard-lg bg-neo-lime text-neo-black hover:bg-neo-lime/90"
        >
          {t('blast.playAgain')}
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={onQuit}
          className="min-h-[48px] font-bold uppercase border-3 border-neo-lime/50 text-neo-lime bg-neo-navy/80 hover:bg-neo-navy"
        >
          {t('common.home')}
        </Button>
      </AdaptiveMotion.div>
    </div>
  );
}

interface BestMomentCellProps {
  icon: IconType;
  label: string;
  value: string;
  sub?: string;
  tint: string;
}

function BestMomentCell({ icon: Icon, label, value, sub, tint }: BestMomentCellProps) {
  return (
    <div className="flex flex-col items-center text-center px-1 py-1">
      <Icon className={cn('w-5 h-5 mb-1', tint)} strokeWidth={2.75} />
      <p className="text-[9px] uppercase tracking-wider font-bold text-white/50 leading-tight">
        {label}
      </p>
      <p className={cn('font-neo-display font-black uppercase text-sm leading-tight', tint)}>
        {value}
      </p>
      {sub && (
        <p className="text-[10px] text-white/60 tabular-nums leading-tight">{sub}</p>
      )}
    </div>
  );
}

export default BlastResultsSummary;
