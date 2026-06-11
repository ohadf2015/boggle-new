'use client';

import React, { memo, useCallback, useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MascotCelebrationVideo, type MascotCelebrationKind } from '@/components/mascot/MascotCelebrationVideo';
import { celebrationTitleFor } from '@/components/mascot/celebrationKind';

/** Confetti palettes per kind — mirror each variant's sparkle colors. */
const CONFETTI_COLORS: Record<MascotCelebrationKind, string[]> = {
  champion: ['#FFE135', '#FF6B35', '#FFFFFF'],
  'runner-up': ['#00FFFF', '#FF1493', '#FFFFFF'],
  defeat: ['#8B5CF6', '#FF1493', '#FFFFFF'],
  bingo: ['#FF1493', '#00FFFF', '#FFE135', '#FFFFFF'],
  knight: ['#FF1493', '#00FFFF', '#FFFFFF'],
  streak: ['#BFFF00', '#00FFFF', '#FFE135'],
  explorer: ['#00FFFF', '#FF1493', '#BFFF00', '#FFFFFF'],
  'mission-complete': ['#FFE135', '#FF6B35', '#BFFF00'],
};

export interface PreResultFanfareProps {
  kind: MascotCelebrationKind;
  onComplete: () => void;
  /** Translation function from the result page (for the big title + skip label) */
  t: (key: string, fallback?: string) => string;
  /** Optional: show a subtle "pre-result moment" label */
  showPreLabel?: boolean;
  /** Size of the video (defaults to large for pre-result impact) */
  size?: string;
  className?: string;
}

/**
 * PreResultFanfare
 *
 * Plays a cool/witty mascot celebration video as the "pre-result" cinematic moment
 * (full attention on the character + moment), then signals completion so the parent
 * can transition to the full result page (hero, podium, stats, etc.).
 *
 * - Uses the real MascotCelebrationVideo (with halo, sparkles, title, neo-brutalist frame).
 * - Nice exit animation before handing off to results.
 * - Skip button for players who want to jump straight to the numbers.
 * - Respects reduced-motion (skips straight to results).
 *
 * Parent usage example:
 *   const [showFanfare, setShowFanfare] = useState(!!kind);
 *   if (showFanfare) {
 *     return <PreResultFanfare kind={kind} t={t} onComplete={() => setShowFanfare(false)} />;
 *   }
 *   return <ResultsLayout hero=... />;
 */
export const PreResultFanfare = memo(function PreResultFanfare({
  kind,
  onComplete,
  t,
  showPreLabel = true,
  size = 'clamp(260px, 72vmin, 560px)',
  className,
}: PreResultFanfareProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleComplete = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);

    // Give the exit animation a moment, then hand off to the result page
    window.setTimeout(() => {
      onComplete();
    }, 420);
  }, [onComplete, isExiting]);

  const handleSkip = useCallback(() => {
    handleComplete();
  }, [handleComplete]);

  // Celebratory confetti burst on mount — two bottom-corner cannons + a centre
  // pop, colour-matched to the kind. Skipped entirely for reduced motion.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let cancelled = false;
    let burstTimer = 0;
    const colors = CONFETTI_COLORS[kind];
    void import('canvas-confetti').then(({ default: confetti }) => {
      if (cancelled) return;
      confetti({ particleCount: 70, spread: 72, startVelocity: 55, angle: 60, origin: { x: 0.12, y: 1 }, colors, ticks: 220, zIndex: 60 });
      confetti({ particleCount: 70, spread: 72, startVelocity: 55, angle: 120, origin: { x: 0.88, y: 1 }, colors, ticks: 220, zIndex: 60 });
      burstTimer = window.setTimeout(() => {
        if (!cancelled) confetti({ particleCount: 60, spread: 110, startVelocity: 38, origin: { x: 0.5, y: 0.42 }, colors, scalar: 1.1, ticks: 200, zIndex: 60 });
      }, 260);
    });
    return () => {
      cancelled = true;
      if (burstTimer) window.clearTimeout(burstTimer);
    };
  }, [kind]);

  const translatedTitle = celebrationTitleFor(kind, t);

  // If user prefers reduced motion we go straight to results (no video)
  const prefersReduced = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced) {
    // Immediately hand off
    onComplete();
    return null;
  }

  return (
    <div
      className={cn(
        'relative flex min-h-[70dvh] w-full flex-col items-center justify-center overflow-hidden',
        'bg-[#0A1828] text-white', // match the game dark navy
        className,
      )}
      data-testid="pre-result-fanfare"
      data-kind={kind}
    >
      {/* Screen-edge electric glow vignette — same effect as the fanfare demo.
          Radial gradient is transparent through the centre and only paints the
          brand pink/cyan past ~78% radius, so it hugs the screen sides. Flashes
          in on mount, then settles into a gentle infinite pulse for the duration
          of the moment. Opacity-only animation = GPU-cheap, no layout cost. */}
      <div
        data-testid="pre-result-edge-glow"
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] animate-[preFanfareEdgeGlow_2600ms_ease-in-out_infinite]"
        style={{
          background:
            'radial-gradient(circle at center, transparent 50%, rgba(191,255,0,0.0) 60%, rgba(255,20,147,0.18) 78%, rgba(0,255,255,0.32) 100%)',
        }}
      />
      <style>{`
        @keyframes preFanfareEdgeGlow {
          0%   { opacity: 0; }
          14%  { opacity: 1; }
          55%  { opacity: 0.55; }
          100% { opacity: 0.85; }
        }
      `}</style>

      {/* Subtle pre-result context label (top) */}
      {showPreLabel && (
        <div className="mb-4 text-[10px] font-bold uppercase tracking-[3px] text-white/50">
          {t('results.preFanfare', 'moment before the results')}
        </div>
      )}

      {/* The actual cool video — centered and prominent (the star of the "pre" experience) */}
      <AnimatePresence>
        {!isExiting && (
          <m.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -10 }}
            transition={{ duration: 0.42, ease: [0.34, 1.56, 0.64, 1] }}
            className="relative"
          >
            <MascotCelebrationVideo
              kind={kind}
              size={size}
              overlay={false}
              autoDismissMs={0}          // we control completion
              onDone={handleComplete}
              title={translatedTitle}
            />
          </m.div>
        )}
      </AnimatePresence>

      {/* Skip control — always available, becomes more prominent if user waits */}
      <button
        type="button"
        onClick={handleSkip}
        className="mt-8 rounded-2xl border-2 border-white/30 bg-white/5 px-5 py-2 text-sm font-bold uppercase tracking-wider text-white/80 backdrop-blur transition hover:border-white/60 hover:bg-white/10 hover:text-white active:scale-[0.985]"
        data-testid="pre-result-skip"
      >
        {t('results.skipToResults', 'Skip to results')}
      </button>

      <p className="mt-3 max-w-[28ch] text-center text-[10px] text-white/40">
        {t('results.fanfareHint', 'The mascot has something to say first…')}
      </p>
    </div>
  );
});

PreResultFanfare.displayName = 'PreResultFanfare';
