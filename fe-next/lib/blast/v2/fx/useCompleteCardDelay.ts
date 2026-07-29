'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

// Royal Match–style settle: after the final word the board's last cascade
// + ovation flash should breathe before the modal slams in. Without this the
// complete card pops on the same frame the last tile clears, which feels abrupt
// and hides the satisfying chain payoff.
//
// Tuned 2026-05-29 for a snappier "next level" loop: the old 700ms settle +
// uncapped per-beat ramp could gate the card for ~1.75s on a deep cascade,
// which read as the game being slow to respond. Settle is now 300ms, each beat
// 250ms, and the chain ramp is capped at 2 beats — a deep cascade adds at most
// 500ms. Players who don't want to wait at all can `skip()` (tap anywhere) to
// reveal the card on the spot.
const BEAT_MS = 250;
const SETTLE_MS = 300;
const MAX_BEATS = 2;

export function useCompleteCardDelay(args: { status: 'playing' | 'levelComplete'; chainDepth: number }) {
  const [show, setShow] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // depth 0/1 → just the settle; each extra chain beat adds one BEAT_MS so a
  // deep cascade's FX finish before the card — capped so it never drags.
  const beats = Math.min(MAX_BEATS, Math.max(0, args.chainDepth - 1));
  const delayMs = beats * BEAT_MS + SETTLE_MS;

  useEffect(() => {
    if (args.status !== 'levelComplete') {
      setShow(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    const id = setTimeout(() => setShow(true), delayMs);
    timerRef.current = id;
    return () => clearTimeout(id);
  }, [args.status, delayMs]);

  // Tap-to-advance: bypass the settle window entirely. Clears the pending timer
  // so it can't fire a redundant setState after we've already revealed.
  const skip = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShow(true);
  }, []);

  return { show, skip };
}
