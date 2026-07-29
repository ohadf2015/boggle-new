'use client';

import { useState, useEffect, useCallback } from 'react';
import { useReducedMotion } from 'framer-motion';

interface ChoreographyOptions {
  /** Base delay before first section reveals (ms) */
  baseDelay?: number;
  /** Stagger between each section (ms) */
  stagger?: number;
}

/**
 * useEntranceChoreography — Orchestrates sequential section reveals.
 *
 * Sections become visible one-by-one with configurable timing.
 * If reduced motion is preferred, all sections are visible immediately.
 */
export function useEntranceChoreography(
  sections: string[],
  options: ChoreographyOptions = {}
) {
  const { baseDelay = 200, stagger = 150 } = options;
  const prefersReduced = useReducedMotion();
  const [visibleCount, setVisibleCount] = useState(prefersReduced ? sections.length : 0);

  useEffect(() => {
    if (prefersReduced) {
      setVisibleCount(sections.length);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    sections.forEach((_, i) => {
      const timer = setTimeout(() => {
        setVisibleCount(prev => Math.max(prev, i + 1));
      }, baseDelay + i * stagger);
      timers.push(timer);
    });

    return () => timers.forEach(t => clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections.length, baseDelay, stagger, prefersReduced]);

  const isVisible = useCallback(
    (section: string) => {
      const idx = sections.indexOf(section);
      return idx >= 0 && idx < visibleCount;
    },
    [sections, visibleCount]
  );

  const getDelay = useCallback(
    (section: string) => {
      if (prefersReduced) return 0;
      const idx = sections.indexOf(section);
      return idx >= 0 ? (baseDelay + idx * stagger) / 1000 : 0;
    },
    [sections, baseDelay, stagger, prefersReduced]
  );

  return { isVisible, getDelay, allVisible: visibleCount >= sections.length };
}
