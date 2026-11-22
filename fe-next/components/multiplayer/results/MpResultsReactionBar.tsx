'use client';

import { useRef } from 'react';
import { REACTIONS } from '@/components/game/QuickReactions';
import { cn } from '@/lib/utils';

/** Server allows 2/s per socket; one tap per 600ms keeps a mashing thumb under it. */
const TAP_GAP_MS = 600;

export interface MpResultsReactionBarProps {
  onSend: (reactionId: string) => void;
  t: (key: string) => string;
  className?: string;
}

export function MpResultsReactionBar({ onSend, t, className }: MpResultsReactionBarProps) {
  const lastTap = useRef(-Infinity);

  const send = (id: string, now: number) => {
    if (now - lastTap.current < TAP_GAP_MS) return;
    lastTap.current = now;
    onSend(id);
  };

  return (
    <div
      role="toolbar"
      aria-label={t('reactions.label')}
      data-testid="mp-results-reactions"
      onPointerDown={(e) => e.stopPropagation()}
      className={cn('flex items-center justify-center gap-[calc(6px*var(--mp-u,1))]', className)}
    >
      {REACTIONS.map((r) => (
        <button
          key={r.id}
          type="button"
          aria-label={t(r.labelKey)}
          onClick={(e) => send(r.id, e.timeStamp)}
          className={cn(
            'flex items-center justify-center rounded-full border-2 border-neo-black bg-neo-navy-light shadow-hard-sm',
            'w-[calc(40px*var(--mp-u,1))] h-[calc(40px*var(--mp-u,1))] text-[calc(20px*var(--mp-u,1))] leading-none',
            'hover:bg-neo-navy-elevated active:translate-y-0.5 active:scale-90 active:shadow-none motion-safe:transition-transform',
          )}
        >
          <span aria-hidden="true">{r.emoji}</span>
        </button>
      ))}
    </div>
  );
}
