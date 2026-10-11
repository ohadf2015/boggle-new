'use client';

import { memo, useMemo, type ReactNode } from 'react';
import { m } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useShouldReduceMotion } from '@/contexts/AccessibilityContext';
import { ShellPanel, type ShellT } from './ShellPanel';
import type { ShellAccent } from './GameShell';
import styles from './gameShell.module.css';

export interface ShellStandingRow {
  id: string;
  name: string;
  score: number;
  isMe?: boolean;
  avatar?: ReactNode;
}

interface ShellStandingsProps {
  rows: readonly ShellStandingRow[];
  t: ShellT;
  title?: string;
  accent?: ShellAccent;
  fill?: boolean;
}

const MEDAL = ['bg-neo-yellow', 'bg-neo-cream', 'bg-[#ff8a3d]'];

function statusLine(sorted: readonly ShellStandingRow[], t: ShellT): string | undefined {
  const meIdx = sorted.findIndex((r) => r.isMe);
  if (meIdx < 0 || sorted.length < 2) return undefined;
  if (sorted[0].score === 0) return t('gameShell.raceOpen');
  if (meIdx === 0) return t('gameShell.leading');
  const above = sorted[meIdx - 1];
  return t('gameShell.behind', { points: above.score - sorted[meIdx].score, name: above.name });
}

/** Live race: rows re-order with a layout slide, bars grow toward the leader. */
function ShellStandingsImpl({ rows, t, title, accent, fill }: ShellStandingsProps) {
  const reduceMotion = useShouldReduceMotion();
  const sorted = useMemo(() => [...rows].sort((a, b) => b.score - a.score), [rows]);
  const top = sorted[0]?.score ?? 0;
  const status = statusLine(sorted, t);

  return (
    <ShellPanel title={title ?? t('gameShell.rivals')} accent={accent} fill={fill} testId="shell-standings">
      <ol className="flex min-h-0 flex-col gap-1.5 overflow-y-auto px-3 pb-3">
        {sorted.map((r, i) => (
          <m.li
            key={r.id}
            layout={reduceMotion ? false : 'position'}
            transition={{ type: 'spring', stiffness: 520, damping: 38 }}
            data-testid={`shell-standing-${r.id}`}
            data-id={r.id}
            data-me={String(!!r.isMe)}
            className={cn(
              'relative flex items-center gap-2.5 rounded-lg border-2 px-2.5 py-2 tv:py-3',
              r.isMe ? 'border-black bg-[var(--panel-accent,var(--shell-accent))] text-black shadow-[3px_3px_0_#000]' : 'border-transparent bg-black/25 text-neo-cream',
            )}
          >
            <span
              className={cn(
                'grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-black font-neo-display text-xs font-black tabular-nums text-black tv:h-9 tv:w-9 tv:text-lg',
                MEDAL[i] ?? 'bg-neo-cream/70',
              )}
            >
              {i + 1}
            </span>
            {r.avatar && <span className="shrink-0">{r.avatar}</span>}
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span dir="auto" className="truncate text-sm font-bold leading-none tv:text-2xl">{r.name}</span>
              <span className={cn('h-1.5 w-full overflow-hidden rounded-full', r.isMe ? 'bg-black/20' : 'bg-black/40')}>
                <span
                  data-bar
                  className={cn(styles.bar, 'block h-full w-full rounded-full', r.isMe ? 'bg-black' : 'bg-neo-pink')}
                  style={{ transform: `scaleX(${top > 0 ? r.score / top : 0})` }}
                />
              </span>
            </span>
            <span dir="ltr" className="shrink-0 font-neo-display text-lg font-black tabular-nums leading-none tv:text-3xl">
              <span key={r.score} className={styles.countPop}>{r.score}</span>
            </span>
          </m.li>
        ))}
      </ol>
      {status && (
        <p data-testid="shell-standings-status" dir="auto" className="border-t-2 border-black/40 px-3.5 py-2 text-xs font-bold uppercase tracking-wide text-neo-cream/75 tv:text-lg">
          {status}
        </p>
      )}
    </ShellPanel>
  );
}

export const ShellStandings = memo(ShellStandingsImpl);
ShellStandings.displayName = 'ShellStandings';
