'use client';

import { m } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ScoreCountUp } from './ScoreCountUp';
import { StatsCardGrid, type StatCardItem } from './StatsCardGrid';
import { SilentVideo } from '@/components/ui/SilentVideo';

type HeroVariant = 'win' | 'loss' | 'neutral';

interface HeroBadge {
  text: string;
  variant: 'completion' | 'milestone' | 'streak';
}

interface ResultsHeroProps {
  /** Outcome text: "YOU WON", "2ND PLACE", "COMPLETED" */
  outcomeLabel: string;
  /** The score to display (counts up) */
  score: number;
  /** Subtitle text above score (e.g. "Puzzle #142") */
  subtitle?: string;
  /** Label below score (e.g. "points") */
  pointsLabel?: string;
  /** 3-stat row config */
  stats: StatCardItem[];
  /** Visual variant for background gradient */
  variant?: HeroVariant;
  /** Optional badge (completion, streak milestone) */
  badge?: HeroBadge;
  /** Click handler for score (e.g. fire confetti) */
  onScoreClick?: () => void;
  /** Score count-up duration in ms */
  countUpDuration?: number;
  /** Use inline stats variant (Daily Challenge style) */
  inlineStats?: boolean;
  className?: string;
}

const gradients: Record<HeroVariant, string> = {
  win: 'from-neo-lime/10 via-transparent to-transparent',
  loss: 'from-neo-pink/10 via-transparent to-transparent',
  neutral: 'from-neo-cyan/10 via-transparent to-transparent',
};

const badgeStyles: Record<string, string> = {
  completion: 'bg-neo-cyan/80 border-neo-cyan/40 text-neo-black',
  milestone: 'bg-linear-to-r from-amber-500/80 to-orange-500/80 border-amber-500/40 text-neo-black',
  streak: 'bg-neo-orange/80 border-neo-orange/40 text-neo-black',
};

/**
 * ResultsHero — Unified hero zone for all results pages.
 *
 * Shows: outcome label → score (animated) → optional badge → 3-stat row.
 * Used by: SinglePlayer, Daily Challenge, Multiplayer (post-reveal).
 */
export function ResultsHero({
  outcomeLabel,
  score,
  subtitle,
  pointsLabel,
  stats,
  variant = 'neutral',
  badge,
  onScoreClick,
  countUpDuration = 1800,
  inlineStats = false,
  className,
}: ResultsHeroProps) {
  return (
    <m.div
      data-testid="results-hero"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'relative text-center bg-linear-to-b py-6 md:py-10 overflow-hidden',
        gradients[variant],
        className,
      )}
    >
      {/* Halftone texture overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-size-[8px_8px]" />

      {/* Outcome label — h1 for a11y, first heading on page */}
      <m.div
        initial={{ opacity: 0, y: -15, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 14 }}
      >
        <m.h1
          className={cn(
            'text-xl sm:text-2xl font-black uppercase tracking-wider',
            variant === 'win' ? 'text-neo-lime' : variant === 'loss' ? 'text-neo-pink' : 'text-neo-cyan',
          )}
          animate={variant === 'win' ? {
            textShadow: [
              '0 0 0px rgba(191,255,0,0)',
              '0 0 16px rgba(191,255,0,0.5)',
              '0 0 0px rgba(191,255,0,0)',
            ],
          } : undefined}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {outcomeLabel}
        </m.h1>
      </m.div>

      {/* Mascot reaction */}
      <m.div
        initial={{ scale: 0, rotate: -15 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 12 }}
        className="flex justify-center"
      >
        <SilentVideo
          src={variant === 'win' ? '/mascot/celebration.webp' : variant === 'loss' ? '/mascot/encouraging.webp' : '/mascot/flexing.webp'}
          width={72}
          height={72}
          className="drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]"
          preload="metadata"
          aria-hidden="true"
        />
      </m.div>

      {/* Subtitle (e.g. puzzle number) */}
      {subtitle && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-xs text-slate-500 uppercase font-bold tracking-wider mt-1"
        >
          {subtitle}
        </m.div>
      )}

      {/* Score — the hero number */}
      <m.div
        data-testid="score-area"
        initial={{ scale: 0.8, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 12 }}
        onClick={onScoreClick}
        whileHover={onScoreClick ? { scale: 1.04 } : undefined}
        whileTap={onScoreClick ? { scale: 0.97 } : undefined}
        className={cn(
          'py-2',
          onScoreClick && 'cursor-pointer',
        )}
      >
        <ScoreCountUp
          to={score}
          delay={300}
          duration={countUpDuration}
          slam
          className="text-7xl md:text-8xl font-black text-white drop-shadow-[0_0_20px_rgba(255,225,53,0.3)]"
        />
        {pointsLabel && (
          <div className="text-neo-white text-sm font-bold mt-1">
            {pointsLabel}
          </div>
        )}
      </m.div>

      {/* Badge (completion, streak milestone) */}
      {badge && (
        <m.div
          initial={{ scale: 0, rotate: -10, y: 8 }}
          animate={{ scale: 1, rotate: 0, y: 0 }}
          transition={{ type: 'spring' as const, stiffness: 400, damping: 10, delay: 0.3 }}
          className="mb-3"
        >
          <span className={cn(
            'inline-flex items-center gap-2 px-4 py-1.5 rounded-full border font-black text-sm',
            badgeStyles[badge.variant] ?? badgeStyles.completion,
          )}>
            {badge.text}
          </span>
        </m.div>
      )}

      {/* Stats row */}
      {stats.length > 0 && (
        <m.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-3 px-4 max-w-md mx-auto"
        >
          <StatsCardGrid
            cards={stats}
            variant={inlineStats ? 'inline' : 'grid'}
          />
        </m.div>
      )}
    </m.div>
  );
}
