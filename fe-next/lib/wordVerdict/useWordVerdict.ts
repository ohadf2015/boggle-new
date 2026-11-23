'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAnnouncer } from '@/components/GameAnnouncer';
import { hapticError, hapticForWordScore as hapticTap } from '@/utils/haptics';
import { verdictMessage, wordVerdict, type VerdictParams, type WordVerdict, type WordVerdictReason } from './wordVerdict';

type Translate = (key: string, params?: Record<string, string | number>) => string | undefined;

export type SpokenVerdict = WordVerdict & { message: string };

interface Options {
  t: Translate;
  /** The mode's own reject sound; called only for error verdicts. */
  playRejectedSound?: () => void;
}

/** Turns a rejection into its message, sound, haptic and screen-reader line; a second miss on the same word escalates. */
export function useWordVerdict({ t, playRejectedSound }: Options) {
  const { announceWordResult } = useAnnouncer();
  const latest = useRef({ t, playRejectedSound, announceWordResult });
  useEffect(() => { latest.current = { t, playRejectedSound, announceWordResult }; });
  const lastMiss = useRef<string | null>(null);

  const reject = useCallback((word: string, reason: WordVerdictReason, params?: VerdictParams): SpokenVerdict => {
    const { t: tt, playRejectedSound: sound, announceWordResult: announce } = latest.current;
    const missKey = `${reason}:${word.toUpperCase()}`;
    const verdict = wordVerdict(reason, params, lastMiss.current === missKey);
    lastMiss.current = missKey;
    const message = verdictMessage(tt, verdict);
    if (verdict.sound) sound?.();
    if (verdict.haptic === 'error') hapticError();
    else if (verdict.haptic === 'tap') hapticTap();
    announce(word.toUpperCase(), false, undefined, message);
    return { ...verdict, message };
  }, []);

  const clearRepeat = useCallback(() => { lastMiss.current = null; }, []);

  return useMemo(() => ({ reject, clearRepeat }), [reject, clearRepeat]);
}
