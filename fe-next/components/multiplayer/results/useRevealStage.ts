'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RevealEventName, RevealTimeline } from './revealTimeline';

interface Options {
  /** Reduced motion / static overlay: no choreography, start fully revealed. */
  instant: boolean;
  /** Fired once per beat as it lands (sounds, confetti). Never on a skip. */
  onBeat?: (name: RevealEventName) => void;
}

/**
 * Drives a reveal timeline with one timeout per beat (no rAF loop, no
 * per-frame state). `stage` counts landed beats; `skip()` lands them all.
 * The timeline is read once at mount — a mid-reveal roster change must not
 * restart the show.
 */
export function useRevealStage(timeline: RevealTimeline, { instant, onBeat }: Options) {
  const total = timeline.events.length;
  const [stage, setStage] = useState(() => (instant ? total : 0));
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onBeatRef = useRef(onBeat);
  useEffect(() => {
    onBeatRef.current = onBeat;
  }, [onBeat]);
  const timelineRef = useRef(timeline);

  const clear = useCallback(() => {
    for (const id of timersRef.current) clearTimeout(id);
    timersRef.current = [];
  }, []);

  useEffect(() => {
    if (instant) return undefined;
    const events = timelineRef.current.events;
    timersRef.current = events.map((ev, i) =>
      setTimeout(() => {
        setStage((s) => Math.max(s, i + 1));
        onBeatRef.current?.(ev.name);
      }, ev.at),
    );
    return clear;
  }, [instant, clear]);

  const skip = useCallback(() => {
    clear();
    setStage(timelineRef.current.events.length);
  }, [clear]);

  return { stage, done: stage >= total, skip };
}
