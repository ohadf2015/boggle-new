'use client';

import React from 'react';
import type { PendingWordStatus } from '@/lib/multiplayer/usePendingWords';

interface Props {
  word: string;
  status: PendingWordStatus;
  onDismiss: (word: string) => void;
}

const statusClass: Record<PendingWordStatus, string> = {
  pending: 'opacity-50 animate-pulse border-neo-white/30 text-neo-white',
  confirmed: 'opacity-100 border-neo-cyan/60 text-neo-cyan',
  rejected: 'opacity-80 border-neo-red/60 text-neo-red line-through animate-neo-shake',
};

export function PendingWordChip({ word, status, onDismiss }: Props): React.ReactElement {
  return (
    <span
      role="status"
      aria-label={`${word} ${status}`}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-neo-body font-bold transition-all duration-300 ${statusClass[status]}`}
      onAnimationEnd={status === 'confirmed' || status === 'rejected' ? () => onDismiss(word) : undefined}
    >
      {word}
    </span>
  );
}
