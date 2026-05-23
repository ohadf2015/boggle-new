'use client';

import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';

const STORAGE_KEY = 'lexiclash_wh_nudges_seen';
const NUDGE_DISPLAY_MS = 4000;

export type NudgeType = 'lifeDrop' | 'firstClue' | 'wrongGuess';

interface NudgeConfig {
  type: NudgeType;
  key: string;
  accent: string;
  icon: string;
}

const NUDGE_CONFIGS: NudgeConfig[] = [
  // Solid bg-neo-navy fill keeps contrast backdrop-independent — the nudge floats
  // over the bright white grid tiles, so a translucent color tint (bg-neo-*/10)
  // let the white bleed through and cream text vanished. Color-coding lives in
  // the full-opacity border + icon instead.
  {
    type: 'lifeDrop',
    key: 'wordHuntNudge.lifeDrop',
    accent: 'border-neo-red bg-neo-navy',
    icon: '❤️‍🩹',
  },
  {
    type: 'firstClue',
    key: 'wordHuntNudge.firstClue',
    accent: 'border-neo-lime bg-neo-navy',
    icon: '💡',
  },
  {
    type: 'wrongGuess',
    key: 'wordHuntNudge.wrongGuess',
    accent: 'border-neo-pink bg-neo-navy',
    icon: '⚠️',
  },
];

/** Check which nudges have been seen (from localStorage) */
function getSeenNudges(): Set<NudgeType> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return new Set(JSON.parse(stored) as NudgeType[]);
  } catch {
    // SSR or parse error
  }
  return new Set();
}

/** Mark a nudge as seen */
function markNudgeSeen(type: NudgeType): void {
  try {
    const seen = getSeenNudges();
    seen.add(type);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]));
  } catch {
    // SSR safety
  }
}

export interface WordHuntFirstTimeNudgesProps {
  lifePoints: number;
  discoveryClueCount: number;
  wrongGuessCount: number;
  t: (key: string) => string;
}

/**
 * Contextual micro-tips shown ONCE per player at key moments.
 * Uses localStorage to remember which nudges have been displayed.
 *
 * Triggers:
 * - lifeDrop: when life first drops below 70
 * - firstClue: when first discovery clue arrives
 * - wrongGuess: when first wrong target guess happens
 */
const WordHuntFirstTimeNudges = memo<WordHuntFirstTimeNudgesProps>(({
  lifePoints,
  discoveryClueCount,
  wrongGuessCount,
  t,
}) => {
  const [activeNudge, setActiveNudge] = useState<NudgeConfig | null>(null);
  const seenRef = useRef(getSeenNudges());
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const activeNudgeRef = useRef(activeNudge);
  activeNudgeRef.current = activeNudge;

  const showNudge = useCallback((type: NudgeType) => {
    if (seenRef.current.has(type) || activeNudgeRef.current) return;
    const config = NUDGE_CONFIGS.find((n) => n.type === type);
    if (!config) return;

    markNudgeSeen(type);
    seenRef.current.add(type);
    setActiveNudge(config);

    dismissTimerRef.current = setTimeout(() => {
      setActiveNudge(null);
    }, NUDGE_DISPLAY_MS);
  }, []);

  // Trigger: life drops below 70
  useEffect(() => {
    if (lifePoints > 0 && lifePoints < 70) {
      showNudge('lifeDrop');
    }
  }, [lifePoints, showNudge]);

  // Trigger: first discovery clue
  useEffect(() => {
    if (discoveryClueCount > 0) {
      showNudge('firstClue');
    }
  }, [discoveryClueCount, showNudge]);

  // Trigger: first wrong guess
  useEffect(() => {
    if (wrongGuessCount > 0) {
      showNudge('wrongGuess');
    }
  }, [wrongGuessCount, showNudge]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none" data-testid="nudge-container">
      <AdaptiveAnimatePresence>
        {activeNudge && (
          <AdaptiveMotion.div
            key={activeNudge.type}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-neo border-2 shadow-hard-sm ${activeNudge.accent}`}
            data-testid={`nudge-${activeNudge.type}`}
          >
            <span className="text-lg" aria-hidden="true">{activeNudge.icon}</span>
            <span className="text-xs font-neo-body font-bold text-neo-cream max-w-[240px]">
              {t(activeNudge.key)}
            </span>
          </AdaptiveMotion.div>
        )}
      </AdaptiveAnimatePresence>
    </div>
  );
});

WordHuntFirstTimeNudges.displayName = 'WordHuntFirstTimeNudges';
export { WordHuntFirstTimeNudges, getSeenNudges, markNudgeSeen, STORAGE_KEY };
