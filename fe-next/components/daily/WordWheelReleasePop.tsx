'use client';

import React from 'react';
import { m } from 'framer-motion';

export interface WheelReleasePopState {
  id: number;
  word: string;
}

export interface WordWheelReleasePopProps {
  pop: WheelReleasePopState | null;
}

const FLAT = 'pointer-events-none absolute';

export default function WordWheelReleasePop({ pop }: WordWheelReleasePopProps) {
  if (!pop) return null;
  return (
    <>
      <m.div
        key={`ring-${pop.id}`}
        data-testid="wheel-release-ring"
        aria-hidden="true"
        className={`${FLAT} inset-0 rounded-full border-4 border-neo-lime z-30`}
        initial={{ scale: 0.6, opacity: 0.9 }}
        animate={{ scale: 1.9, opacity: 0 }}
        transition={{ duration: 0.65, ease: 'easeOut' }}
      />
      <m.div
        key={`word-${pop.id}`}
        data-testid="wheel-release-pop"
        aria-hidden="true"
        dir="auto"
        className={`${FLAT} -top-12 start-1/2 -translate-x-1/2 z-30 font-neo-display font-black text-3xl sm:text-4xl text-neo-lime whitespace-nowrap [text-shadow:0_3px_0_rgba(0,0,0,0.7)]`}
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: [0.4, 1.2, 1, 1], opacity: [0, 1, 1, 0], y: [0, 0, 0, -36] }}
        transition={{ duration: 0.9, times: [0, 0.2, 0.6, 1], ease: 'easeOut' }}
      >
        {pop.word}
      </m.div>
    </>
  );
}
