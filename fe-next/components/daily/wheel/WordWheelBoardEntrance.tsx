'use client';

import React, { useEffect, useState } from 'react';
import { m } from 'framer-motion';

export const BOARD_ENTRANCE_MS = 300;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface WordWheelBoardEntranceProps {
  className?: string;
  /** The clock ran out: the board sinks back under the TIME stamp. */
  settled?: boolean;
  children: (entranceDone: boolean) => React.ReactNode;
}

/**
 * Transform-only entrance and no exit: an opacity tween on this full-screen layer flashes on the mobile Chromium renderer.
 */
export default function WordWheelBoardEntrance({ className, settled = false, children }: WordWheelBoardEntranceProps) {
  const [reduced] = useState(prefersReducedMotion);
  const [entranceDone, setEntranceDone] = useState(reduced);

  useEffect(() => {
    if (reduced) return;
    const id = setTimeout(() => setEntranceDone(true), BOARD_ENTRANCE_MS);
    return () => clearTimeout(id);
  }, [reduced]);

  return (
    <m.div
      className={className}
      initial={reduced ? false : { y: 24, scale: 0.96 }}
      animate={settled ? { y: 12, scale: 0.94 } : { y: 0, scale: 1 }}
      transition={{ type: 'spring', duration: BOARD_ENTRANCE_MS / 1000, bounce: 0.2 }}
    >
      {children(entranceDone)}
    </m.div>
  );
}
