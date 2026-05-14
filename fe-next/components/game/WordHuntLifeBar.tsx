/**
 * WordHuntLifeBar
 * Neo-brutalist life bar for Word Hunt in PortraitLayout.
 * Segmented pips, animated heart, shimmer, drip-on-damage (no shake).
 */

'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface WordHuntLifeBarProps {
  life: number;
  maxLife: number;
}

/** Smooth color interpolation via inline style instead of hard tier switches */
function getLifeColors(pct: number) {
  // Heart background and glow tier (CSS classes still needed for heart bg)
  if (pct > 66) return { heart: 'bg-emerald-500', glow: '' };
  if (pct > 33) return { heart: 'bg-amber-500', glow: '' };
  return { heart: 'bg-red-500', glow: 'life-bar-danger-glow' };
}

/** Interpolate an [r,g,b] triple from green → amber → red based on pct */
function interpolateBarColor(pct: number): { from: string; via: string; to: string } {
  // Green tier: emerald-400  → green-400  → emerald-500
  // Amber tier: amber-400    → yellow-400 → orange-400
  // Red tier:   red-500      → rose-500   → red-600
  // We keep Tailwind classes for simplicity but blend at boundaries
  if (pct > 70) return { from: 'from-emerald-400', via: 'via-green-400', to: 'to-emerald-500' };
  if (pct > 58) return { from: 'from-emerald-400', via: 'via-yellow-300', to: 'to-amber-400' };
  if (pct > 42) return { from: 'from-amber-400', via: 'via-yellow-400', to: 'to-orange-400' };
  if (pct > 28) return { from: 'from-orange-400', via: 'via-orange-500', to: 'to-red-400' };
  return { from: 'from-red-500', via: 'via-rose-500', to: 'to-red-600' };
}

let dripIdCounter = 0;

export function WordHuntLifeBar({ life, maxLife }: WordHuntLifeBarProps) {
  const { t } = useLanguage();
  const pct = Math.min(100, Math.max(0, (life / maxLife) * 100));
  const colors = getLifeColors(pct);
  const gradient = interpolateBarColor(pct);
  const isLow = pct <= 20;

  // Drip droplets on life decrease (replaces shake)
  const prevLifeRef = useRef(life);
  const [drips, setDrips] = useState<{ id: number; x: number; size: number; delay: number }[]>([]);

  const spawnDrips = useCallback((fillPct: number) => {
    const count = 3 + Math.floor(Math.random() * 2); // 3-4 droplets
    const newDrips = Array.from({ length: count }, () => ({
      id: dripIdCounter++,
      x: Math.max(8, fillPct) + (Math.random() * 6 - 3), // near the fill edge
      size: 3 + Math.random() * 3, // 3-6px
      delay: Math.random() * 0.25,
    }));
    setDrips(newDrips);
  }, []);

  useEffect(() => {
    if (life < prevLifeRef.current) {
      spawnDrips(pct);
      const timer = setTimeout(() => setDrips([]), 1200);
      prevLifeRef.current = life;
      return () => clearTimeout(timer);
    }
    prevLifeRef.current = life;
    return undefined;
  }, [life, pct, spawnDrips]);

  const segments = [25, 50, 75];

  return (
    <div
      data-testid="word-hunt-life-bar"
      className="flex items-center gap-2 w-full py-1"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={t('wordHunt.lifeBar')}
    >
      {/* Heart icon */}
      <m.div
        className={cn(
          "shrink-0 flex items-center justify-center w-9 h-9 rounded-full",
          "border-3 border-neo-black shadow-hard-sm",
          colors.heart
        )}
        animate={isLow ? { scale: [1, 1.15, 1] } : {}}
        transition={{ duration: 1, repeat: isLow ? Infinity : 0, ease: 'easeInOut' }}
      >
        <Heart data-testid="heart-icon" className="w-4 h-4 text-white fill-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.4)]" />
      </m.div>

      {/* Bar container — allow overflow for drips; glow scoped here to avoid parent jitter */}
      <div data-testid="word-hunt-life-bar-track" className={cn("flex-1 relative", colors.glow)}>
        <m.div
          className={cn(
            "h-7 rounded-neo overflow-hidden border-3 shadow-hard-sm relative",
            "bg-neo-navy/80",
            "border-neo-black"
          )}
        >
          {/* Fill — gradient classes transition smoothly via CSS */}
          <m.div
            data-testid="word-hunt-life-bar-fill"
            className={cn(
              "h-full relative overflow-hidden bg-linear-to-r transition-colors duration-700 ease-in-out",
              gradient.from, gradient.via, gradient.to,
              isLow && "life-bar-low-pulse"
            )}
            style={{ width: `${Math.max(pct, 8)}%` }}
            animate={{ width: `${Math.max(pct, 8)}%` }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div
              data-testid="word-hunt-life-bar-shimmer"
              className="absolute inset-0 bg-linear-to-r from-transparent via-white/25 to-transparent animate-shimmer pointer-events-none"
            />
            <div className="absolute inset-x-0 top-0 h-[3px] bg-linear-to-r from-white/40 via-white/20 to-white/40 pointer-events-none" />
          </m.div>

          {/* Segments */}
          {segments.map((seg) => (
            <div key={seg} className="absolute top-0 bottom-0 w-[2px] bg-neo-black/30 pointer-events-none" style={{ left: `${seg}%` }} />
          ))}

          {/* Label */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className={cn(
              "text-xs font-black tabular-nums tracking-wide",
              "drop-shadow-[0_1px_3px_rgb(0_0_0/0.7)]",
              pct > 50 ? "text-white" : "text-neo-white"
            )}>
              {Math.floor(life)}/{maxLife}
            </span>
          </div>
        </m.div>

        {/* Drip droplets — fall below the bar on damage */}
        <AnimatePresence>
          {drips.map((drip) => (
            <m.div
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
        </AnimatePresence>
      </div>
    </div>
  );
}
