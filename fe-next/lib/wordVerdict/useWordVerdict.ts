'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAnnouncer } from '@/components/GameAnnouncer';
import { hapticError } from '@/utils/haptics';
import { canEscalate, verdictMessage, wordVerdict, type VerdictParams, type WordVerdict, type WordVerdictReason } from './wordVerdict';

type Translate = (key: string, params?: Record<string, string | number>) => string | undefined;

export type SpokenVerdict = WordVerdict & { message: string };

interface Options {
  t: Translate;
  /** The mode's own reject sound; called only for error verdicts. */
  playRejectedSound?: () => void;
  /** A new round or board; the repeat streak starts over when it changes. */
  resetKey?: unknown;
}

/** Turns a rejection into its message, sound, haptic and screen-reader line; a second miss on the same word escalates. */
export function useWordVerdict({ t, playRejectedSound, resetKey }: Options) {
  const { announceWordResult } = useAnnouncer();
  const latest = useRef({ t, playRejectedSound, announceWordResult });
  useEffect(() => { latest.current = { t, playRejectedSound, announceWordResult }; });
  const lastMiss = useRef<string | null>(null);
  useEffect(() => { lastMiss.current = null; }, [resetKey]);

  const reject = useCallback((word: string, reason: WordVerdictReason, params?: VerdictParams): SpokenVerdict => {
    const { t: tt, playRejectedSound: sound, announceWordResult: announce } = latest.current;
    const missKey = `${reason}:${word.toUpperCase()}`;
    const escalates = canEscalate(reason);
    const verdict = wordVerdict(reason, params, escalates && lastMiss.current === missKey);
    if (escalates) lastMiss.current = missKey;
    const message = verdictMessage(tt, verdict);
    if (verdict.sound) sound?.();
    if (verdict.haptic === 'error') hapticError();
    announce(word.toUpperCase(), false, undefined, message);
    return { ...verdict, message };
  }, []);

  const clearRepeat = useCallback(() => { lastMiss.current = null; }, []);

  return useMemo(() => ({ reject, clearRepeat }), [reject, clearRepeat]);
}
