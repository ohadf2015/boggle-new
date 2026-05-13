'use client';
import { useEffect, useState } from 'react';

const BEAT_MS = 350;
const SETTLE_MS = 700;

/**
 * Returns whether the BlastLevelCompleteCard should be visible.
 * False during cascade settle; true after `(chainDepth - 1) × 350ms + 700ms`.
 * This delay lets the player see each cascade beat + final ovation flash before
 * the modal pops.
 */
export function useCompleteCardDelay(args: { status: 'playing' | 'levelComplete'; chainDepth: number }) {
  const { status, chainDepth } = args;
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (status !== 'levelComplete') {
      setShow(false);
      return;
    }
    const beats = Math.max(0, chainDepth - 1);
    const settleMs = beats * BEAT_MS + SETTLE_MS;
    const tid = setTimeout(() => setShow(true), settleMs);
    return () => clearTimeout(tid);
  }, [status, chainDepth]);
  return show;
}
