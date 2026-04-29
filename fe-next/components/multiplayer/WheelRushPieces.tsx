'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface WordEntry {
  word: string;
  kind: 'locked' | 'stolen' | 'closed' | 'stolen-from-me';
  score?: number;
  lockUntil?: number;
  stolenFrom?: string;
  ts: number;
}

interface MyWordsChipsProps {
  words: WordEntry[];
}

export const MyWordsChips: React.FC<MyWordsChipsProps> = ({ words }) => {
  if (words.length === 0) return null;
  return (
    <div className="max-h-16 overflow-y-auto flex flex-wrap gap-1.5 justify-center">
      {words.slice(0, 20).map((w, i) => (
        <span
          key={`${w.word}-${i}`}
          data-kind={w.kind}
          dir="auto"
          className={cn(
            'px-2 py-0.5 rounded border-2 border-neo-black text-xs font-neo-body font-bold',
            w.kind === 'stolen-from-me' ? 'bg-neo-red text-neo-white line-through' :
            w.kind === 'stolen' ? 'bg-neo-pink text-neo-white' :
            w.kind === 'closed' ? 'bg-neo-cyan text-neo-black' :
            'bg-neo-lime text-neo-black',
          )}
        >
          {w.word}{w.score ? ` +${w.score}` : ''}
        </span>
      ))}
    </div>
  );
};
