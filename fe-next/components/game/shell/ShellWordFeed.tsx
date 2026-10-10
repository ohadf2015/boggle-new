'use client';

import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ShellPanel, type ShellT } from './ShellPanel';
import type { ShellAccent } from './GameShell';
import styles from './gameShell.module.css';

export interface ShellWord {
  word: string;
  /** Omitted by modes that score by tiles cleared rather than per word. */
  score?: number;
  /** A mode's own reward label (e.g. "+12 ♥") shown where the score would be. */
  detail?: string;
}

interface ShellWordFeedProps {
  /** In the order they were found (oldest first). */
  words: readonly ShellWord[];
  t: ShellT;
  accent?: ShellAccent;
  title?: string;
}

const MAX_ROWS = 60;

/** Found words, newest on top: the fresh word slams into a hero slot and the rest shift down. */
function ShellWordFeedImpl({ words, t, accent, title }: ShellWordFeedProps) {
  const newestFirst = useMemo(() => words.slice(-MAX_ROWS).reverse(), [words]);
  const scored = words.some((w) => typeof w.score === 'number');
  const points = useMemo(() => words.reduce((sum, w) => sum + (w.score ?? 0), 0), [words]);
  const best = useMemo(
    () => words.reduce<ShellWord | null>((top, w) => (!top || w.word.length > top.word.length ? w : top), null),
    [words],
  );
  const count = words.length;
  const [fresh, ...older] = newestFirst;

  return (
    <ShellPanel
      title={title ?? t('gameShell.words')}
      accent={accent}
      fill
      testId="shell-words"
      aside={
        <span className="flex shrink-0 items-center gap-1.5 font-neo-display text-sm font-bold tabular-nums tv:text-2xl">
          {scored && count > 0 && (
            <span className="text-neo-cream/60" dir="ltr">
              <span key={`p${points}`} data-testid="shell-words-points" className={styles.countPop}>{points}</span>
              <span className="ms-0.5 text-[10px] uppercase tracking-wider">{t('gameShell.pts')}</span>
            </span>
          )}
          <span className="rounded-full border-2 border-black bg-[var(--panel-accent,var(--shell-accent))] px-2 text-black">
            <span key={`c${count}`} data-testid="shell-words-count" className={styles.countPop}>{count}</span>
          </span>
        </span>
      }
    >
      {count === 0 ? (
        <div data-testid="shell-words-empty" className="m-auto flex flex-col items-center gap-3 p-6 text-center">
          <div
            aria-hidden="true"
            className="flex w-44 items-center justify-between rounded-lg border-2 border-dashed border-neo-cream/30 px-3 py-2 font-neo-display font-bold uppercase text-neo-cream/40"
          >
            <span>• • • •</span>
            <span dir="ltr" className="tabular-nums">+?</span>
          </div>
          <p dir="auto" className="font-neo-display text-base font-bold uppercase tracking-wide text-neo-cream text-balance tv:text-2xl">
            {t('gameShell.wordsEmptyTitle')}
          </p>
          <p dir="auto" className="max-w-[17rem] text-sm font-semibold leading-snug text-neo-cream/60 text-balance tv:text-lg">
            {t('gameShell.wordsEmptyBody')}
          </p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-3">
          <div
            key={`${fresh.word}-${count}`}
            data-testid={`shell-word-row-${fresh.word}`}
            data-word={fresh.word}
            data-fresh="true"
            className={styles.feedSlam}
          >
            <div className={cn(styles.feedFlash, 'flex items-center justify-between gap-3 rounded-lg border-3 border-black bg-[#0f1729] px-3 py-2.5 text-neo-cream shadow-[3px_3px_0_#000]')}>
              <span dir="auto" className="min-w-0 truncate font-neo-display text-2xl font-black uppercase tracking-wide tv:text-4xl">
                {fresh.word}
              </span>
              {(typeof fresh.score === 'number' || fresh.detail) && (
                <span dir="ltr" className={cn(styles.ptsRise, 'shrink-0 rounded-md border-2 border-black bg-neo-cream px-2 font-neo-display text-lg font-black tabular-nums text-black')}>
                  {fresh.detail ?? `+${fresh.score}`}
                </span>
              )}
            </div>
          </div>
          <ul key={count} className={cn(styles.rowShift, 'flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden [scrollbar-width:thin]')} aria-live="polite">
            {older.map((w, i) => (
              <li
                key={`${w.word}-${count - 1 - i}`}
                data-testid={`shell-word-row-${w.word}`}
                data-word={w.word}
                data-fresh="false"
                className="flex items-center justify-between gap-2 rounded-md bg-black/25 px-3 py-1.5 tv:py-2.5"
              >
                <span dir="auto" className="min-w-0 truncate font-neo-display text-base font-bold uppercase tracking-wide text-neo-cream/90 tv:text-2xl">
                  {w.word}
                </span>
                {(typeof w.score === 'number' || w.detail) && (
                  <span dir="ltr" className="shrink-0 font-neo-display text-sm font-black tabular-nums text-[var(--panel-accent,var(--shell-accent))] tv:text-xl">
                    {w.detail ?? `+${w.score}`}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {best && best.word.length >= 5 && (
            <p data-testid="shell-words-best" className="flex items-baseline justify-between gap-2 border-t-2 border-black/40 pt-2 text-[11px] font-bold uppercase tracking-wider text-neo-cream/60">
              <span>{t('gameShell.best')}</span>
              <span dir="auto" className="truncate font-neo-display text-sm text-neo-yellow">{best.word}</span>
            </p>
          )}
        </div>
      )}
    </ShellPanel>
  );
}

export const ShellWordFeed = memo(ShellWordFeedImpl);
ShellWordFeed.displayName = 'ShellWordFeed';
