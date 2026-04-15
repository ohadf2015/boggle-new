'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface WheelLockInfo {
  word: string;
  by: string;
  lockUntil: number;
}

export interface WordEntry {
  word: string;
  kind: 'locked' | 'stolen' | 'closed';
  score?: number;
  lockUntil?: number;
  stolenFrom?: string;
  ts: number;
}

interface StealableLocksProps {
  locks: WheelLockInfo[];
  now: number;
  username: string;
}

export const StealableLocks: React.FC<StealableLocksProps> = ({ locks, now, username }) => {
  if (locks.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 justify-center mt-1">
      {locks.map(lock => {
        const msLeft = Math.max(0, lock.lockUntil - now);
        const pct = Math.max(0, Math.min(100, (msLeft / 3000) * 100));
        const isMine = lock.by === username;
        return (
          <div
            key={lock.word}
            className="relative px-2 py-0.5 rounded border-2 border-neo-black bg-neo-pink text-neo-white text-xs font-bold font-neo-body overflow-hidden"
            title={`Locked by ${lock.by} — ${(msLeft / 1000).toFixed(1)}s to steal`}
          >
            <span className="relative z-10">
              {isMine ? lock.word : `??? (${Math.ceil(msLeft / 100) / 10}s)`}
            </span>
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 bg-neo-pink-dark/60"
              style={{ width: `${pct}%` }}
            />
          </div>
        );
      })}
    </div>
  );
};

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
          className={cn(
            'px-2 py-0.5 rounded border-2 border-neo-black text-xs font-neo-body font-bold',
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
