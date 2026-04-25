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
  kind: 'locked' | 'stolen' | 'closed' | 'stolen-from-me';
  score?: number;
  lockUntil?: number;
  stolenFrom?: string;
  ts: number;
}

interface StealableLocksProps {
  locks: WheelLockInfo[];
  now: number;
  username: string;
  t?: (path: string, params?: Record<string, string | number>) => string;
}

export const StealableLocks: React.FC<StealableLocksProps> = ({ locks, now, username, t }) => {
  if (locks.length === 0) return null;
  const label = t?.('wordWheel.stealLabel') || 'STEAL';
  return (
    <div className="flex flex-wrap gap-1.5 justify-center items-center mt-1 shrink-0 px-2">
      <span className="text-[10px] sm:text-xs font-neo-display font-black text-neo-pink tracking-widest opacity-80">
        {label}
      </span>
      {locks.map(lock => {
        const msLeft = Math.max(0, lock.lockUntil - now);
        const pct = Math.max(0, Math.min(100, (msLeft / 3000) * 100));
        const isMine = lock.by === username;
        const secs = (Math.ceil(msLeft / 100) / 10).toFixed(1);
        return (
          <div
            key={lock.word}
            className="relative px-2 py-0.5 rounded border-2 border-neo-black bg-neo-pink text-neo-white text-xs font-bold font-neo-body overflow-hidden tabular-nums"
            title={`Locked by ${lock.by} — ${(msLeft / 1000).toFixed(1)}s to steal`}
          >
            <span className="relative z-10">
              {isMine ? lock.word : `??? · ${secs}s`}
            </span>
            <span
              aria-hidden
              className="absolute inset-y-0 start-0 bg-neo-pink-dark/60"
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
          data-kind={w.kind}
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
