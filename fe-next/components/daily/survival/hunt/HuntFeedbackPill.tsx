'use client';

import React from 'react';
import { m } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SPRING_PRESETS } from '@/lib/animation/presets';
import type { FeedbackType } from '../types';

export interface HuntFeedbackPillProps {
  seq: number;
  type: FeedbackType | null;
  message: string;
  word: string | null;
  calm: boolean;
}

function tone(type: FeedbackType): string {
  if (type === 'valid-word' || type === 'target-found') return 'bg-neo-lime/15 text-neo-lime';
  if (type === 'duplicate' || type === 'too-short' || type === 'too-long') return 'bg-neo-orange/15 text-neo-orange';
  return 'bg-neo-red/15 text-neo-red';
}

/** Keyed by seq with no exit: a new result swaps in the same frame instead of queueing behind the old one. */
export function HuntFeedbackPill({ seq, type, message, word, calm }: HuntFeedbackPillProps) {
  return (
    <div data-testid="hunt-feedback-row" className="shrink-0 h-6 flex items-center justify-center">
      {type && message && (
        <m.div
          key={seq}
          data-testid="hunt-feedback-pill"
          data-type={type}
          role="status"
          initial={calm ? false : { y: -6, scale: 0.7 }}
          animate={{ y: 0, scale: 1 }}
          transition={SPRING_PRESETS.entrance}
          className={cn('max-w-full truncate text-xs font-bold px-2.5 py-0.5 rounded-full', tone(type))}
        >
          {word && <span className="font-black uppercase tracking-wider me-1">{word}</span>}
          {message}
        </m.div>
      )}
    </div>
  );
}

export default HuntFeedbackPill;
