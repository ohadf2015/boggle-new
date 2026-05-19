'use client';

import React, { useRef, useEffect, useState, useCallback, memo } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LifeGainAnimation } from '../LifeGainAnimation';
import { MobileTooltip } from '@/components/ui/MobileTooltip';

export interface SurvivalLifeBarProps {
  lifePoints: number;
  isGameOver: boolean;
  isLifeGaining: boolean;
  lifeGainAmount: number | null;
  skipAnimations: boolean;
  onLifeGainComplete: () => void;
  /** Neutral accessible label / tooltip shown while life is healthy. Optional —
   *  when omitted (e.g. single-player Survival callers) the bar renders bare,
   *  unchanged. */
  label?: string;
  /** Encouragement shown (as tooltip + aria-label) once life enters the red
   *  danger tier (<=33) while the game is still running — nudges the player to
   *  find words to heal. */
  lowLifeHint?: string;
}

/** Color tier for the life bar */
function getLifeTier(pct: number) {
  if (pct > 66) return { gradient: 'from-emerald-400 via-green-400 to-emerald-500', heart: 'bg-emerald-500', border: 'border-emerald-400/60', glow: '' };
  if (pct > 33) return { gradient: 'from-amber-400 via-yellow-400 to-orange-400', heart: 'bg-amber-500', border: 'border-amber-400/60', glow: '' };
  return { gradient: 'from-red-500 via-rose-500 to-red-600', heart: 'bg-red-500', border: 'border-red-500/80', glow: 'life-bar-danger-glow' };
}

/**
 * Neo-brutalist life bar with animated heart, segmented pips, shimmer, and damage feedback
 */
export const SurvivalLifeBar = memo<SurvivalLifeBarProps>(({
  lifePoints,
  isGameOver,
  isLifeGaining,
  lifeGainAmount,
  skipAnimations,
  onLifeGainComplete,
  label,
  lowLifeHint,
}) => {
  const pct = Math.min(100, Math.max(0, lifePoints));
  const tier = getLifeTier(pct);
  const isLow = pct <= 20;
  const isDanger = pct <= 33;

  // Tooltip / accessible label: encourage healing once life hits the red danger
  // tier (mirrored into aria-label so screen readers get the same nudge). Fall
  // back to the neutral label otherwise. Don't nag once the game is over.
  const tooltipText = isDanger && !isGameOver && lowLifeHint ? lowLifeHint : label;

  // Drip droplets + red flash on damage
  const prevLifeRef = useRef(lifePoints);
  const [drips, setDrips] = useState<{ id: number; x: number; size: number; delay: number }[]>([]);
  const [isDamaged, setIsDamaged] = useState(false);
  const dripIdRef = useRef(0);

  const spawnDrips = useCallback((fillPct: number) => {
    const count = 3 + Math.floor(Math.random() * 2);
    const newDrips = Array.from({ length: count }, () => ({
      id: dripIdRef.current++,
      x: Math.max(8, fillPct) + (Math.random() * 6 - 3),
      size: 3 + Math.random() * 3,
      delay: Math.random() * 0.25,
    }));
    setDrips(newDrips);
  }, []);

  useEffect(() => {
    if (lifePoints < prevLifeRef.current && !isGameOver) {
      spawnDrips(pct);
      setIsDamaged(true);
      const dripTimer = setTimeout(() => setDrips([]), 1200);
      const damageTimer = setTimeout(() => setIsDamaged(false), 600);
      prevLifeRef.current = lifePoints;
      return () => { clearTimeout(dripTimer); clearTimeout(damageTimer); };
    }
    prevLifeRef.current = lifePoints;
    return undefined;
  }, [lifePoints, isGameOver, pct, spawnDrips]);

  // Segment markers for visual rhythm (every 25%)
  const segments = [25, 50, 75];

  const bar = (
    <div
      className={cn(
        "flex items-center gap-2 max-w-3xl mx-auto w-full relative py-1 [@media(max-height:560px)]:py-0 overflow-x-clip",
        tier.glow
      )}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={tooltipText || undefined}
    >
      {/* Life gain animation */}
      <LifeGainAnimation
        amount={lifeGainAmount}
        onComplete={onLifeGainComplete}
      />

      {/* Heart icon — neo-brutalist circle with pulse */}
      <AdaptiveMotion.div
        key={`heart-${isLifeGaining ? 'beating' : 'idle'}`}
        className={cn(
          "shrink-0 flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 [@media(max-height:560px)]:w-7 [@media(max-height:560px)]:h-7 rounded-full",
          "border-2 border-neo-cream/15",
          tier.heart,
          isLifeGaining && "heart-beating"
        )}
        animate={
          !skipAnimations && isLow && !isGameOver && !isLifeGaining
            ? { scale: [1, 1.2, 0.95, 1.1, 1] }
            : {}
        }
        transition={{
          duration: 0.8,
          repeat: isLow && !isLifeGaining ? Infinity : 0,
          ease: 'easeInOut',
        }}
      >
        <Heart className={cn(
          "w-4 h-4 sm:w-5 sm:h-5 text-white fill-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]",
          isLifeGaining && "heart-beating"
        )} />
      </AdaptiveMotion.div>

      {/* Life bar wrapper — relative for drip overflow */}
      <div className="flex-1 relative">
      <AdaptiveMotion.div
        className={cn(
          "h-7 sm:h-8 [@media(max-height:560px)]:h-5 rounded-neo overflow-hidden border-2 relative transition-colors duration-300",
          "bg-neo-navy/80",
          isDamaged ? "border-neo-cream/30 bg-red-900/20" : "border-neo-cream/10",
          isLifeGaining && "life-gain-flash life-meter-pulse"
        )}
      >
        {/* Fill bar */}
        <AdaptiveMotion.div
          className={cn(
            "h-full flex items-center relative overflow-hidden",
            "bg-linear-to-r",
            tier.gradient,
            isLow && !isLifeGaining && !skipAnimations && "life-bar-low-pulse"
          )}
          style={{ width: `${Math.max(pct, 8)}%` }}
          animate={{ width: `${Math.max(pct, 8)}%` }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Shimmer sweep */}
          <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/25 to-transparent animate-shimmer pointer-events-none" />

          {/* Inner highlight — top edge glow */}
          <div className="absolute inset-x-0 top-0 h-[3px] bg-linear-to-r from-white/40 via-white/20 to-white/40 pointer-events-none" />
        </AdaptiveMotion.div>

        {/* Segment markers */}
        {segments.map((seg) => (
          <div
            key={seg}
            className="absolute top-0 bottom-0 w-[2px] bg-neo-black/30 pointer-events-none"
            style={{ left: `${seg}%` }}
          />
        ))}

        {/* Life text — always visible, positioned center of bar */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className={cn(
            "text-xs sm:text-sm font-black tabular-nums tracking-wide",
            "drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]",
            pct > 50 ? "text-white" : pct > 0 ? "text-neo-white" : "text-neo-white/60"
          )}>
            {Math.floor(lifePoints)}/100
          </span>
        </div>

        {/* Drain particles at low health */}
        {!skipAnimations && isDanger && pct > 0 && !isGameOver && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[0, 1, 2, 3].map((i) => (
              <AdaptiveMotion.div
                key={`particle-${i}`}
                className="absolute w-1.5 h-1.5 bg-red-400 rounded-full opacity-80"
                style={{ left: `${pct}%`, top: '50%' }}
                animate={{
                  x: [0, 15 + i * 8],
                  y: [0, (i % 2 === 0 ? -12 : 12) - i * 3],
                  opacity: [0.8, 0],
                  scale: [1, 0.3],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.25,
                  ease: 'easeOut',
                }}
              />
            ))}
          </div>
        )}
      </AdaptiveMotion.div>

        {/* Drip droplets — fall below the bar on damage */}
        <AdaptiveAnimatePresence>
          {drips.map((drip) => (
            <AdaptiveMotion.div
              key={drip.id}
              data-testid="life-drip-droplet"
              className="absolute rounded-full pointer-events-none"
              style={{
                left: `${drip.x}%`,
                top: '100%',
                width: drip.size,
                height: drip.size,
                background: pct > 42
                  ? 'linear-gradient(to bottom, #fbbf24, #f59e0b)'
                  : 'linear-gradient(to bottom, #f87171, #ef4444)',
              }}
              initial={{ y: -4, opacity: 0.9, scale: 1 }}
              animate={{
                y: [0, 8, 18],
                opacity: [0.9, 0.7, 0],
                scale: [1, 1.1, 0.5],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.8,
                delay: drip.delay,
                ease: 'easeIn',
              }}
            />
          ))}
        </AdaptiveAnimatePresence>
      </div>
    </div>
  );

  // Wrap in a tap/hover tooltip only when there's text to surface. MP passes
  // label + lowLifeHint; single-player Survival callers pass neither, so the
  // bar renders bare and unchanged (backward-compatible).
  if (!tooltipText) return bar;
  return (
    <MobileTooltip content={tooltipText} side="top">
      {bar}
    </MobileTooltip>
  );
});
SurvivalLifeBar.displayName = 'SurvivalLifeBar';
