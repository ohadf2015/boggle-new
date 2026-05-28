'use client';

/**
 * BlastBragCard — shareable "brag" panel for the Blast results screen.
 *
 * Purpose: give the player a single, dense visual moment they can screenshot
 * or share via Web Share API. Uses data already surfaced on `results`:
 * percentile, finalScore, bestWord, maxCombo, wavesCompleted.
 *
 * The brag headline scales with percentile:
 *   - top 1%   → LEGEND
 *   - top 10%  → ELITE
 *   - top 25%  → GREAT RUN
 *   - top 50%  → SOLID
 *   - otherwise → NICE TRY (still encouraging, not mocking)
 *
 * Sharing:
 *   - Prefer `navigator.share` (mobile-first) — shares text only, no image.
 *   - Fallback to clipboard copy + sonner toast.
 * Telemetry fires exactly once per share attempt, tagged with method.
 *
 * This component is pure presentational + a single click handler; all
 * rank math lives in `getBragTier` so it is testable in isolation.
 */

import { useCallback, useMemo } from 'react';
import { Crown, Share2, Trophy, Zap, Star } from 'lucide-react';
import { toast } from 'sonner';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';
import { trackBlastBrag } from './utils/blastTelemetry';
import type { BlastResultsData } from './types';

export interface BragTier {
  /** i18n key suffix: blast.results.brag.{key} */
  key: 'legend' | 'elite' | 'great' | 'solid' | 'nice';
  /** Tailwind classes for the headline pill background. */
  pillClass: string;
  /** Colored glow applied as inline boxShadow (keeps hard 3px offset). */
  glow: string;
}

/**
 * Map a percentile (0-100, higher = better) to a brag tier.
 * Exported for unit tests — pure function, no side effects.
 */
export function getBragTier(percentile: number | null | undefined): BragTier {
  const p = percentile ?? 0;
  if (p >= 99) {
    return {
      key: 'legend',
      pillClass: 'bg-linear-to-r from-yellow-300 via-white to-yellow-300 text-neo-black',
      glow: '0 0 32px rgba(255,215,0,0.7), 3px 3px 0 #000',
    };
  }
  if (p >= 90) {
    return {
      key: 'elite',
      pillClass: 'bg-linear-to-r from-neo-pink via-fuchsia-400 to-neo-pink text-white',
      glow: '0 0 26px rgba(255,20,147,0.55), 3px 3px 0 #000',
    };
  }
  if (p >= 75) {
    return {
      key: 'great',
      pillClass: 'bg-linear-to-r from-neo-lime to-neo-cyan text-neo-black',
      glow: '0 0 22px rgba(191,255,0,0.5), 3px 3px 0 #000',
    };
  }
  if (p >= 50) {
    return {
      key: 'solid',
      pillClass: 'bg-neo-cyan text-neo-black',
      glow: '0 0 18px rgba(0,255,255,0.45), 3px 3px 0 #000',
    };
  }
  return {
    key: 'nice',
    pillClass: 'bg-neo-lime-muted text-neo-black',
    glow: '0 0 14px rgba(191,255,0,0.35), 3px 3px 0 #000',
  };
}

interface BlastBragCardProps {
  results: BlastResultsData;
  t: (key: string, vars?: Record<string, string | number> | string) => string;
}

export function BlastBragCard({ results, t }: BlastBragCardProps) {
  const tier = useMemo(() => getBragTier(results.percentile), [results.percentile]);
  const topPct = results.percentile != null
    ? Math.max(1, 100 - results.percentile)
    : null;
  const beats = results.percentile ?? 0;

  const handleShare = useCallback(async () => {
    const title = t('blast.results.brag.shareTitle');
    const scoreLine = t('blast.results.brag.shareScore', {
      score: results.finalScore.toLocaleString(),
    });
    const rankLine = topPct != null
      ? t('blast.results.brag.shareRank', { pct: String(topPct) })
      : '';
    const body = [title, scoreLine, rankLine].filter(Boolean).join('\n');

    // Prefer Web Share API (mobile). Fall back to clipboard.
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title, text: body });
        trackBlastBrag({
          finalScore: results.finalScore,
          percentile: results.percentile ?? null,
          method: 'share',
        });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard.
      }
    }

    try {
      await navigator.clipboard.writeText(body);
      toast.success(t('blast.results.brag.copied'));
      trackBlastBrag({
        finalScore: results.finalScore,
        percentile: results.percentile ?? null,
        method: 'clipboard',
      });
    } catch {
      toast.error(t('blast.results.brag.copyFailed'));
    }
  }, [results.finalScore, results.percentile, topPct, t]);

  // Don't render until backend has returned a percentile — otherwise the
  // whole "brag" is meaningless. The smaller pill in the parent already
  // handles the "ranking…" loading state.
  if (results.percentile == null) return null;

  return (
    <AdaptiveMotion.div
      initial={{ scale: 0.9, opacity: 0, y: 10 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.2 }}
      className={cn(
        'w-full relative overflow-hidden',
        'rounded-neo border-3 border-neo-black p-4',
        'bg-linear-to-br from-neo-navy via-neo-navy-light to-neo-navy',
      )}
      style={{ boxShadow: '6px 6px 0 #000' }}
      data-testid="blast-brag-card"
    >
      {/* Halftone accent strip */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-neo-pink via-neo-lime to-neo-cyan"
      />

      {/* Headline tier pill */}
      <div className="flex items-center justify-between gap-2 mb-3 mt-1">
        <div
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5',
            'rounded-neo border-3 border-neo-black',
            'font-neo-display font-black uppercase tracking-wider text-sm',
            tier.pillClass,
          )}
          style={{ boxShadow: tier.glow }}
          data-testid={`blast-brag-tier-${tier.key}`}
        >
          <Crown className="w-4 h-4" strokeWidth={2.75} />
          {t(`blast.results.brag.${tier.key}`)}
        </div>
        <button
          type="button"
          onClick={handleShare}
          className={cn(
            'flex items-center gap-1 px-3 py-1.5',
            'rounded-neo border-3 border-neo-black bg-neo-lime text-neo-black',
            'font-neo-display font-black uppercase text-xs tracking-wide',
            'shadow-hard hover:shadow-hard-pressed hover:translate-y-px',
            'transition-all active:scale-[0.97]',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-neo-pink',
          )}
          data-testid="blast-brag-share"
          aria-label={t('blast.results.brag.shareAria')}
        >
          <Share2 className="w-3.5 h-3.5" strokeWidth={3} />
          {t('blast.results.brag.share')}
        </button>
      </div>

      {/* Big comparison line */}
      <p className="text-white font-neo-display font-black text-2xl leading-tight">
        {t('blast.results.brag.beats', { pct: String(beats) })}
      </p>
      <p className="text-[11px] uppercase tracking-widest text-white font-bold mt-0.5">
        {t('blast.results.brag.weeklyCohort')}
      </p>

      {/* Stat strip */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <BragStat
          icon={Trophy}
          label={t('blast.results.brag.score')}
          value={results.finalScore.toLocaleString()}
          tint="text-neo-lime"
        />
        <BragStat
          icon={Zap}
          label={t('blast.results.brag.combo')}
          value={`x${results.maxCombo}`}
          tint="text-neo-pink"
        />
        <BragStat
          icon={Star}
          label={t('blast.results.brag.bestWord')}
          value={results.bestWord ? results.bestWord.toUpperCase() : '—'}
          tint="text-neo-cyan"
        />
      </div>
    </AdaptiveMotion.div>
  );
}

interface BragStatProps {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  tint: string;
}

function BragStat({ icon: Icon, label, value, tint }: BragStatProps) {
  return (
    <div className="rounded-neo border-2 border-neo-black bg-neo-black/40 px-2 py-1.5">
      <div className="flex items-center gap-1">
        <Icon className={cn('w-3 h-3', tint)} strokeWidth={2.75} />
        <p className="text-[9px] uppercase tracking-widest font-bold text-white">
          {label}
        </p>
      </div>
      <p className={cn('font-neo-display font-black text-sm tabular-nums truncate', tint)}>
        {value}
      </p>
    </div>
  );
}
