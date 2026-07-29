/**
 * useBossGridEffect Hook
 *
 * Manages timed boss grid visual effects. Accepts an effect trigger,
 * looks up the CSS class/data-attr from GRID_EFFECT_MAP, and auto-clears
 * after the configured duration.
 *
 * Returns CSS class and data attribute to apply to the grid container.
 * All animations are CSS-driven — no per-tile React state.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { GRID_EFFECT_MAP } from '@/components/adventure/bossGridEffects';

interface BossGridEffectResult {
  /** CSS class to add to grid container */
  gridClass: string;
  /** data-boss-effect attribute value (null = no effect) */
  dataAttr: string | null;
}

export function useBossGridEffect(
  effectTrigger: { name: string; id: number } | null,
  prefersReducedMotion: boolean
): BossGridEffectResult {
  const [active, setActive] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!effectTrigger) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    const def = GRID_EFFECT_MAP[effectTrigger.name];
    if (!def) return;

    setActive(effectTrigger.name);

    // For reduced motion: show briefly then clear (structural hint only)
    const duration = prefersReducedMotion ? 300 : def.durationMs;
    timerRef.current = setTimeout(() => {
      setActive(null);
      timerRef.current = null;
    }, duration);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [effectTrigger, prefersReducedMotion]);

  if (!active) return { gridClass: '', dataAttr: null };

  const def = GRID_EFFECT_MAP[active];
  if (!def) return { gridClass: '', dataAttr: null };

  return {
    gridClass: def.cssClass,
    dataAttr: def.dataAttr,
  };
}
