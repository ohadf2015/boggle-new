'use client';

import { memo, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import Avatar from '../../../components/Avatar';
import { rowsThatFit } from '../tv-broadcast/rowsThatFit';
import type { Avatar as AvatarType } from '@/shared/types/game';

interface LeaderboardPlayer {
  username: string;
  score: number;
  avatar?: AvatarType | null;
  wordCount?: number;
  rank: number;
}

interface TvResultsLeaderboardProps {
  players: LeaderboardPlayer[];
  visible: boolean;
  startRank?: number; // Start from rank 4 by default (skip podium)
  maxVisible?: number;
  t: (path: string, params?: Record<string, string | number>) => string;
}

const ROW_TESTID = 'tv-results-rank-row';
const OVERFLOW_LINE_PX = 0;

function useFitRows(scrollerRef: RefObject<HTMLElement | null>, total: number, active: boolean): number {
  const [fit, setFit] = useState(total);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const measure = () => {
      const content = scroller.firstElementChild as HTMLElement | null;
      const next = rowsThatFit({
        containerPx: scroller.clientHeight,
        overflowLinePx: OVERFLOW_LINE_PX,
        contentPx: content?.getBoundingClientRect().height ?? 0,
        renderedRows: scroller.querySelectorAll(`[data-testid="${ROW_TESTID}"]`).length,
        total,
      });
      setFit((prev) => (prev === next ? prev : next));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [scrollerRef, total, active]);

  return Math.min(fit, total);
}

/**
 * TvResultsLeaderboard - Full ranking display for 4th place and below
 * Shows only the rows that fit the space left under the stats; the rest become "+N more".
 */
const TvResultsLeaderboard = memo<TvResultsLeaderboardProps>(({
  players,
  visible,
  startRank = 4,
  maxVisible = 10,
  t,
}) => {
  const ranked = useMemo(() => players.filter(p => p.rank >= startRank), [players, startRank]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const fit = useFitRows(scrollerRef, Math.min(ranked.length, maxVisible), visible);
  const displayPlayers = ranked.slice(0, fit);
  const remainingCount = ranked.length - displayPlayers.length;

  if (ranked.length === 0) return null;

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          data-testid="tv-results-standings"
          initial={{ x: 20 }}
          animate={{ x: 0 }}
          exit={{ x: -20 }}
          className="flex h-full min-h-0 flex-col gap-2"
        >
          <div className="flex items-baseline gap-3">
            <h3 className="font-neo-display text-[clamp(1rem,2.1vh,1.4rem)] font-black uppercase tracking-wide text-neo-cream">
              {t('tvResults.fullRankings')}
            </h3>
            {remainingCount > 0 && (
              <p className="ms-auto text-sm font-bold text-neo-cream/70">
                {remainingCount === 1
                  ? t('tvResults.andMore', { count: remainingCount })
                  : t('tvResults.andMorePlural', { count: remainingCount })}
              </p>
            )}
          </div>

          <div ref={scrollerRef} className="min-h-0 flex-1 overflow-hidden">
            <div className="flex flex-col gap-2">
              {displayPlayers.map((player, index) => (
                <m.div
                  key={player.username}
                  data-testid={ROW_TESTID}
                  initial={{ x: 30 }}
                  animate={{ x: 0 }}
                  transition={{ delay: index * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
                  className="flex items-center gap-3 rounded-neo border-3 border-neo-black bg-neo-cream px-3 py-1.5 shadow-hard-sm"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-neo border-2 border-neo-black bg-neo-white font-neo-display text-base font-black text-neo-black">
                    {player.rank}
                  </span>
                  <Avatar
                    avatarImage={player.avatar?.avatarImage}
                    customAvatar={player.avatar?.customAvatar}
                    size="md"
                    className="shrink-0 border-2 border-neo-black"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[clamp(0.9rem,1.7vh,1.15rem)] font-black leading-tight text-neo-black [overflow-wrap:anywhere]">
                      {player.username}
                    </p>
                    {player.wordCount !== undefined && (
                      <p className="text-xs font-bold text-neo-black/60">
                        {player.wordCount} {t('tvResults.words')}
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 font-neo-display text-[clamp(1.1rem,2.2vh,1.5rem)] font-black text-neo-black">
                    {player.score}
                    <span className="ms-1 text-xs font-bold uppercase text-neo-black/60">{t('tvResults.pts')}</span>
                  </p>
                </m.div>
              ))}
            </div>
          </div>

        </m.div>
      )}
    </AnimatePresence>
  );
});

TvResultsLeaderboard.displayName = 'TvResultsLeaderboard';

export default TvResultsLeaderboard;
