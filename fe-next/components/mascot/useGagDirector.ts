'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { emitMascotEvent, subscribeMascotEvents } from '@/lib/blast/mascotBus';
import { hasGemLetter } from '@/lib/blast/gemLetters';
import { createSeededRng } from '@/lib/mascot/rng';
import { canInterrupt, daysBetween, fitToRemaining, forSession, localDayKey, pickGag, variantDurationMs } from '@/lib/mascot/gagDirector';
import { loadGagHistory, saveGagHistory } from '@/lib/mascot/gagHistory';
import { loadClipManifest, withClip, type ClipEntry } from '@/lib/mascot/clipManifest';
import type { GagDef, GagEvent, GagVariant } from '@/lib/mascot/gagTypes';
import type { Language } from '@/shared/types/game';
import { useIdleTrigger } from './useIdleTrigger';

export interface ActiveGag {
  gag: GagDef;
  variant: GagVariant;
  key: number;
}

interface Options {
  enabled: boolean;
  language?: Language;
  seed?: number;
  onShow: (gag: GagDef, variant: GagVariant) => void;
}

let sessionShown = 0;
let sessionCount = 0;
const newSessionId = () => `${Date.now().toString(36)}-${++sessionCount}`;
let sessionId = newSessionId();
let manifestPromise: Promise<Map<string, ClipEntry>> | null = null;

/** Test-only reset. */
export function _resetGagSession(): void {
  sessionShown = 0;
  sessionId = newSessionId();
  manifestPromise = null;
}

export function useGagDirector({ enabled, language, seed, onShow }: Options): ActiveGag | null {
  const [active, setActive] = useState<ActiveGag | null>(null);
  const activeRef = useRef<ActiveGag | null>(null);
  const round = useRef({ shown: 0, lastShownAt: null as number | null, rejections: 0, words: 0 });
  const clips = useRef<Map<string, ClipEntry>>(new Map());
  const rngRef = useRef<() => number>(Math.random);
  const endTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onShowRef = useRef(onShow);
  onShowRef.current = onShow;
  const languageRef = useRef(language);
  languageRef.current = language;

  const stop = useCallback(() => {
    if (endTimer.current) clearTimeout(endTimer.current);
    endTimer.current = null;
    activeRef.current = null;
    setActive(null);
  }, []);

  const dispatch = useCallback((event: GagEvent) => {
    const r = round.current;
    const ctx = { rejectionsThisRound: r.rejections, wordsThisRound: r.words };
    if (activeRef.current && !canInterrupt(event, ctx)) return;
    const now = Date.now();
    const history = forSession(loadGagHistory(), sessionId);
    const pick = pickGag(
      event,
      ctx,
      { shownThisRound: r.shown, shownThisSession: sessionShown, lastShownAt: r.lastShownAt },
      history,
      rngRef.current,
      now,
      localDayKey(now),
    );
    if (!pick) return;
    if (endTimer.current) clearTimeout(endTimer.current);
    saveGagHistory(pick.history);
    r.shown += 1;
    r.lastShownAt = now;
    sessionShown += 1;
    let variant = withClip(pick.variant, clips.current);
    if (event.kind === 'timer-final-10s') variant = fitToRemaining(variant, event.secondsLeft * 1000);
    const next = { gag: pick.gag, variant, key: now };
    activeRef.current = next;
    setActive(next);
    onShowRef.current(pick.gag, variant);
    if (pick.gag.holdUntil !== 'word') endTimer.current = setTimeout(stop, variantDurationMs(variant));
  }, [stop]);

  useEffect(() => {
    if (!enabled) return;
    rngRef.current = seed === undefined ? Math.random : createSeededRng(seed);
    manifestPromise ??= loadClipManifest();
    let live = true;
    void manifestPromise.then((map) => {
      if (live) clips.current = map;
    });

    const now = Date.now();
    const history = loadGagHistory();
    const daysAway = history.lastPlayedAt === null ? null : daysBetween(history.lastPlayedAt, now);
    saveGagHistory({ ...history, lastPlayedAt: now });
    dispatch({ kind: 'session-start', daysAway });

    const unsubscribe = subscribeMascotEvents((event) => {
      const r = round.current;
      const isAttempt = event.kind === 'word-submitted' || event.kind === 'word-rejected' || event.kind === 'duplicate-word';
      if (isAttempt && activeRef.current?.gag.holdUntil === 'word') stop();
      if (event.kind === 'word-submitted') {
        r.words += 1;
        const lang = languageRef.current;
        if (event.word && lang && hasGemLetter(event.word, lang)) {
          const letter = [...event.word].find((ch) => hasGemLetter(ch, lang)) ?? '';
          emitMascotEvent({ kind: 'rare-letter', letter });
        }
      }
      if (event.kind === 'word-rejected') r.rejections += 1;
      dispatch(event);
    });
    return () => {
      live = false;
      unsubscribe();
      if (endTimer.current) clearTimeout(endTimer.current);
    };
  }, [enabled, seed, dispatch, stop]);

  useIdleTrigger(enabled, () => dispatch({ kind: 'idle' }));

  return enabled ? active : null;
}
