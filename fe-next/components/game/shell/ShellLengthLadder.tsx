'use client';

import { memo, useMemo, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import type { ShellT } from './ShellPanel';
import styles from './gameShell.module.css';

const BUCKETS = [3, 4, 5, 6, 7] as const;
const bucketOf = (word: string) => Math.min(7, Math.max(3, [...word].length));

interface ShellLengthLadderProps {
  words: readonly { word: string }[];
  t: ShellT;
}

function ShellLengthLadderImpl({ words, t }: ShellLengthLadderProps) {
  const counts = useMemo(() => {
    const c = new Map<number, number>(BUCKETS.map((b) => [b, 0]));
    for (const w of words) c.set(bucketOf(w.word), (c.get(bucketOf(w.word)) ?? 0) + 1);
    return c;
  }, [words]);
  const max = Math.max(1, ...counts.values());
  const fresh = words.length ? bucketOf(words[words.length - 1].word) : null;

  return (
    <div data-testid="shell-words-ladder" className="shrink-0 border-t-2 border-black/40 px-3 pb-3 pt-2">
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-neo-cream/60 tv:text-base">{t('gameShell.byLength')}</p>
      <div dir="ltr" className="grid grid-cols-5 gap-2">
        {BUCKETS.map((b) => {
          const n = counts.get(b) ?? 0;
          const isFresh = b === fresh;
          return (
            <div key={b} data-testid={`shell-ladder-${b}`} data-len={b} data-count={n} data-fresh={isFresh} className="flex flex-col items-center gap-1">
              <span key={`${b}-${n}`} className={cn('font-neo-display text-sm font-black tabular-nums tv:text-xl', n ? 'text-neo-cream' : 'text-neo-cream/30', isFresh && styles.countPop)}>
                {n}
              </span>
              <div className="relative h-12 w-full overflow-hidden rounded-md border-2 border-black bg-black/30 tv:h-20">
                <div
                  className={cn(styles.ladderFill, 'absolute inset-0 rounded-[3px]', isFresh ? 'bg-[var(--panel-accent,var(--shell-accent))]' : 'bg-neo-cream/35')}
                  style={{ '--ladder': n / max } as CSSProperties}
                />
              </div>
              <span className="font-neo-display text-xs font-bold text-neo-cream/60 tv:text-base">{b === 7 ? '7+' : b}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const ShellLengthLadder = memo(ShellLengthLadderImpl);
ShellLengthLadder.displayName = 'ShellLengthLadder';
