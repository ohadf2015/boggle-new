'use client';

import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronUp, ChevronDown } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ClosestRivalsView, RivalRow } from '@/lib/leaderboard/selectClosestRivals';

/**
 * Live "Close Race" panel for desktop multiplayer: the handful of players nearest
 * to me in score, anchored on my own row. Same component serves classic (desktop
 * shell) and blast — both feed a {@link ClosestRivalsView} from the pure
 * `selectClosestRivals`; this component only renders + animates.
 *
 * Motion uses framer-motion to cohere with the existing leaderboard idiom
 * (RosterRail / GameLeaderboard): rows spring to new positions on rank change,
 * the score badge pops when a player just scored, and the rival about to pass me
 * (or be passed) pulses. Reduced-motion users get the same data, no animation.
 *
 * Neo-brutalist refined: navy card, hard pixel shadow, pink (multiplayer) accent
 * header, cyan "YOU" anchor. No gradient text, no accent border-stripes.
 */
export interface ClosestRivalsPanelProps {
  view: ClosestRivalsView | null;
  /** |Δscore| at-or-below which an adjacent rival is "imminent" (pulses). */
  pulseThreshold?: number;
  className?: string;
}

const DEFAULT_PULSE_THRESHOLD = 25;

function deltaLabel(
  t: (k: string, v?: Record<string, string | number>) => string,
  row: RivalRow,
): string {
  if (row.direction === 'ahead') return t('mp.rivals.toCatch', { n: row.deltaToMe });
  if (row.direction === 'behind') return t('mp.rivals.ahead', { n: -row.deltaToMe });
  return t('mp.rivals.tie');
}

function ClosestRivalsPanelImpl({
  view,
  pulseThreshold = DEFAULT_PULSE_THRESHOLD,
  className = '',
}: ClosestRivalsPanelProps) {
  const { t } = useLanguage();
  const reduce = useReducedMotion();

  if (!view || view.rows.length <= 1) return null;

  const meIndex = view.rows.findIndex((r) => r.isMe);

  const rowTransition = reduce
    ? { duration: 0 }
    : ({ type: 'spring', stiffness: 600, damping: 44 } as const);

  return (
    <section
      data-testid="closest-rivals-panel"
      data-component="closest-rivals"
      aria-label={t('mp.rivals.aria')}
      className={[
        'flex flex-col rounded-neo border-neo-thick border-foreground bg-neo-navy-light',
        'shadow-hard overflow-hidden',
        className,
      ].join(' ')}
    >
      {/* Header — pink (multiplayer) bar, Fredoka display */}
      <header className="flex items-baseline justify-between gap-2 px-3 py-2 bg-neo-pink/15 border-b-2 border-foreground">
        <span className="font-neo-display font-bold uppercase tracking-wide text-sm text-neo-pink-light">
          {t('mp.rivals.header')}
        </span>
        <span className="font-mono text-[11px] tabular-nums opacity-60">
          {t('mp.rivals.playersCount', { n: view.total })}
        </span>
      </header>

      <ul className="flex flex-col gap-1.5 p-2" aria-label={t('mp.rivals.aria')}>
        {view.rows.map((row, idx) => {
          const adjacentToMe = meIndex >= 0 && Math.abs(idx - meIndex) === 1;
          const imminent =
            !row.isMe && adjacentToMe && Math.abs(row.deltaToMe) <= pulseThreshold;

          return (
            <motion.li
              key={row.id}
              layout={!reduce}
              animate={
                imminent && !reduce
                  ? {
                      boxShadow: [
                        '0 0 0 0 rgba(255,20,147,0)',
                        '0 0 0 3px rgba(255,20,147,0.55)',
                        '0 0 0 0 rgba(255,20,147,0)',
                      ],
                    }
                  : { boxShadow: '0 0 0 0 rgba(255,20,147,0)' }
              }
              transition={{
                layout: rowTransition,
                boxShadow:
                  imminent && !reduce
                    ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0 },
              }}
              data-testid={`rivals-row-${row.id}`}
              data-row="true"
              data-you={row.isMe ? 'true' : 'false'}
              data-rank={row.rank}
              data-direction={row.direction}
              data-imminent={imminent ? 'true' : 'false'}
              className={[
                'flex items-center gap-2 px-2.5 py-2 rounded-lg border-2',
                row.isMe
                  ? 'border-neo-cyan bg-neo-cyan/10 ring-2 ring-neo-cyan/60'
                  : imminent
                    ? 'border-neo-pink bg-card'
                    : 'border-foreground bg-card',
              ].join(' ')}
            >
              {/* Rank */}
              <span className="font-mono text-xs w-5 text-center shrink-0 opacity-50 tabular-nums">
                {row.rank}
              </span>

              <Avatar
                size="sm"
                customAvatar={row.customAvatar ?? undefined}
                userId={row.id}
                disableEffects
              />

              {/* Name + YOU chip */}
              <span className="flex-1 min-w-0 flex items-center gap-1.5">
                <span className="truncate text-sm font-medium">{row.name}</span>
                {row.isMe && (
                  <span className="shrink-0 px-1.5 py-px rounded-md bg-neo-cyan text-neo-navy text-[9px] font-bold uppercase tracking-wide">
                    {t('mp.rivals.you')}
                  </span>
                )}
              </span>

              {/* Score + delta badge */}
              <div className="flex flex-col items-end shrink-0">
                <span className="font-bold tabular-nums text-sm leading-none">
                  {row.score.toLocaleString()}
                </span>
                {!row.isMe && (
                  <span
                    data-testid={`rivals-delta-${row.id}`}
                    className={[
                      'mt-1 flex items-center gap-0.5 text-[10px] font-bold tabular-nums leading-none',
                      row.direction === 'ahead'
                        ? 'text-neo-pink-light'
                        : row.direction === 'behind'
                          ? 'text-neo-lime'
                          : 'text-neo-cream/70',
                    ].join(' ')}
                  >
                    {row.direction === 'ahead' && (
                      <ChevronUp className="w-3 h-3" aria-hidden="true" />
                    )}
                    {row.direction === 'behind' && (
                      <ChevronDown className="w-3 h-3" aria-hidden="true" />
                    )}
                    {deltaLabel(t, row)}
                  </span>
                )}
              </div>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}

export const ClosestRivalsPanel = memo(ClosestRivalsPanelImpl);
export default ClosestRivalsPanel;
