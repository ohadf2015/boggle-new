'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { Zap, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBlastOpponentActivity } from '@/hooks/gameState/selectors';
import { selectBlastLeaderboardStrip, type BlastLeaderboardEntry } from '@/lib/blast/selectMyBlastScore';

interface BlastMPLeaderboardProps {
  leaderboard: BlastLeaderboardEntry[];
  username?: string;
  /** Translator. Optional so the component degrades to English fallbacks. */
  t?: (key: string) => string | undefined;
}

/**
 * BlastMPLeaderboard — compact inline live-standings strip under the HUD in
 * multiplayer Blast. Reworked for clarity:
 *   - the current player is ALWAYS shown (even outside the top slice) with a
 *     "YOU" tag + their true rank, so you can always read your live position;
 *   - the leader carries a crown; every row shows an explicit "#rank";
 *   - a pulsing "LIVE" chip frames the strip as real-time standings;
 *   - a transient "opponent found word" flash keeps the round feeling shared.
 *
 * Positioned inline (not absolute) so it can never overlap the HUD on notched
 * devices where `pt-safe` pushes the HUD below the old offset.
 */
export const BlastMPLeaderboard = memo(function BlastMPLeaderboard({
  leaderboard,
  username,
  t,
}: BlastMPLeaderboardProps) {
  const opponentActivity = useBlastOpponentActivity();
  const label = (key: string, fallback: string) => t?.(key) || fallback;

  // Track per-username flash state — when a new activity event lands for a
  // player, briefly pulse their pill so presence feels alive.
  const [flashingUser, setFlashingUser] = useState<string | null>(null);
  const lastSeenIdRef = useRef<string | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const latest = opponentActivity[opponentActivity.length - 1];
    if (!latest || latest.id === lastSeenIdRef.current) return;
    lastSeenIdRef.current = latest.id;

    setFlashingUser(latest.username);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlashingUser(null), 1200);

    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [opponentActivity]);

  if (typeof window !== 'undefined' && window.location.search.includes('lbdebug')) {
    console.info('[lbdebug][render] BlastMPLeaderboard prop:', (leaderboard || []).map(e => `${e.username}=${e.score}`).join(', ') || '(empty)');
  }

  const rows = selectBlastLeaderboardStrip(leaderboard, username, 4);
  if (rows.length === 0) return null;

  const latestActivity = opponentActivity[opponentActivity.length - 1] ?? null;

  return (
    <div className="relative shrink-0 px-2 pt-1.5 pb-1" data-testid="blast-mp-leaderboard">
      {/* Compact horizontal pill row, framed by a pulsing LIVE chip */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span
          className="flex items-center gap-1 shrink-0 px-1.5 py-1 text-[9px] font-black uppercase tracking-wider text-neo-pink"
          aria-hidden="true"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-neo-pink blast-heartbeat" />
          {label('blast.live', 'LIVE')}
        </span>

        {rows.map(({ entry, rank, isMe }) => {
          const isLeader = rank === 1;
          const isFlashing = flashingUser === entry.username && !isMe;
          return (
            <m.div
              key={entry.username}
              data-leader={isLeader ? 'true' : undefined}
              data-me={isMe ? 'true' : undefined}
              animate={
                isFlashing
                  ? { scale: [1, 1.12, 1], boxShadow: ['0 0 0 rgba(0,255,255,0)', '0 0 12px rgba(0,255,255,0.8)', '0 0 0 rgba(0,255,255,0)'] }
                  : { scale: 1 }
              }
              transition={{ duration: 0.9, ease: 'easeOut' }}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-neo text-xs font-bold tabular-nums shrink-0',
                'border-2 border-neo-black shadow-hard-sm',
                isMe
                  ? 'bg-neo-lime text-neo-navy'
                  : isFlashing
                    ? 'bg-neo-cyan/80 text-neo-navy'
                    : 'bg-neo-navy/85 text-neo-white',
              )}
              aria-label={`#${rank} ${isMe ? label('blast.you', 'YOU') : entry.username} ${entry.score}`}
            >
              {/* Rank badge — crown for the leader, explicit #rank otherwise */}
              <span className="flex items-center justify-center min-w-[18px] shrink-0">
                {isLeader ? (
                  <Crown className="w-3.5 h-3.5 text-neo-yellow" strokeWidth={3} fill="currentColor" />
                ) : (
                  <span className="opacity-60">#{rank}</span>
                )}
              </span>
              {/* Name — own row reads "YOU" so the player spots themself instantly */}
              <span className={cn('truncate max-w-[72px]', isMe && 'font-black uppercase tracking-wide')}>
                {isMe ? label('blast.you', 'YOU') : entry.username}
              </span>
              {/* Live score — bold + prominent */}
              <span className="ms-auto pl-1 text-sm font-black">{entry.score}</span>
            </m.div>
          );
        })}
      </div>

      {/* Transient opponent word-found toast — reinforces shared play */}
      <AnimatePresence>
        {latestActivity && latestActivity.username !== username && latestActivity.type === 'word' && latestActivity.word && (
          <m.div
            key={latestActivity.id}
            initial={{ opacity: 0, y: -4, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50"
          >
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-neo border-2 border-neo-black shadow-hard-sm bg-neo-cyan text-neo-navy text-[10px] font-black uppercase tracking-wide">
              <Zap className="w-3 h-3" strokeWidth={3} />
              <span className="truncate max-w-[100px]">{latestActivity.username}</span>
              <span className="opacity-80">→</span>
              <span>{latestActivity.word}</span>
              {latestActivity.score != null && latestActivity.score > 0 && (
                <span className="text-neo-red">+{latestActivity.score}</span>
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
});
BlastMPLeaderboard.displayName = 'BlastMPLeaderboard';
