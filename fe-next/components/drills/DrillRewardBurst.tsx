'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { cn } from '@/lib/utils';
import { useShouldReduceMotion } from '@/contexts/AccessibilityContext';
import { getPerformanceConfig } from '@/components/grid/performanceUtils';
import { buildBurst, burstColor, type BurstSpec } from '@/lib/drills/collectBurst';

interface DrillRewardBurstProps {
  /** Increment this every collect event to fire a burst (e.g. wordsFound.length). */
  trigger: number;
  /** 0..1 normalized reward strength — scales the spray. */
  magnitude: number;
  /** Stable identifier for this collect (word + index) so the burst is deterministic. */
  seedKey?: string | number;
  /** Optional centre label, e.g. "+50". */
  label?: string;
}

/**
 * DrillRewardBurst — the satisfying spray of sparks when the player collects a
 * word/gem inside a drill. Rendered as an absolute, pointer-events-none overlay
 * that fills its positioned parent, so it NEVER affects layout flow (the grid
 * can't be pushed). GSAP animates the particles outward from the centre.
 *
 * Fully gated: players with reduced-motion, or low-end devices where complex
 * animations are disabled, get nothing (the collect still reads via sound +
 * the score update). Place inside a `relative` container that wraps the grid.
 */
export default function DrillRewardBurst({ trigger, magnitude, seedKey, label }: DrillRewardBurstProps) {
  const reduceMotion = useShouldReduceMotion();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const [burst, setBurst] = useState<BurstSpec | null>(null);
  const [animate, setAnimate] = useState(false);

  // Resolve perf gate once on mount (it reads device/hardware, stable per session).
  useEffect(() => {
    setAnimate(getPerformanceConfig().enableComplexAnimations);
  }, []);

  const enabled = animate && !reduceMotion;

  // Build a fresh burst spec on each trigger (skip the initial 0 / disabled).
  useEffect(() => {
    if (!enabled || trigger <= 0) return;
    setBurst(buildBurst(magnitude, seedKey ?? trigger));
  }, [trigger, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Animate the freshly-rendered particles outward, then clean them up.
  useEffect(() => {
    if (!burst || !rootRef.current) return;
    const ctx = gsap.context(() => {
      const dots = gsap.utils.toArray<HTMLElement>('[data-burst-dot]');
      gsap.fromTo(
        dots,
        { x: 0, y: 0, scale: 0, autoAlpha: 1 },
        {
          x: (i) => Math.cos(burst.particles[i].angle) * burst.particles[i].distance,
          y: (i) => Math.sin(burst.particles[i].angle) * burst.particles[i].distance,
          scale: (i) => 0.6 + (burst.particles[i].size / 16),
          rotation: (i) => burst.particles[i].rotation,
          autoAlpha: 0,
          ease: 'power3.out',
          duration: 0.62,
          delay: (i) => burst.particles[i].delay,
        },
      );
      if (labelRef.current) {
        gsap.fromTo(
          labelRef.current,
          { scale: 0.4, y: 8, autoAlpha: 0 },
          { scale: 1, y: -28, autoAlpha: 1, ease: 'back.out(2)', duration: 0.32 },
        );
        gsap.to(labelRef.current, { autoAlpha: 0, y: -44, duration: 0.3, delay: 0.42 });
      }
    }, rootRef);
    return () => ctx.revert();
  }, [burst]);

  if (!enabled || !burst) return null;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-visible"
    >
      <div className="relative">
        {burst.particles.map((p) => (
          <span
            key={p.id}
            data-burst-dot
            className={cn(
              'absolute top-0 left-0 rounded-full border border-neo-black/40',
              burstColor(p.id),
            )}
            style={{ width: p.size, height: p.size }}
          />
        ))}
        {label && (
          <span
            ref={labelRef}
            data-burst-label
            className="absolute top-0 left-1/2 -translate-x-1/2 whitespace-nowrap font-black text-neo-yellow text-lg drop-shadow-[1px_1px_0_rgba(0,0,0,0.9)]"
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
