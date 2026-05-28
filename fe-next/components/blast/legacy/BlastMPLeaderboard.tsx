'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBlastOpponentActivity } from '@/hooks/gameState/selectors';

interface LeaderboardEntry {
  username: string;
  score: number;
  wordCount?: number;
}

interface BlastMPLeaderboardProps {
  leaderboard: LeaderboardEntry[];
  username?: string;
}

/**
 * BlastMPLeaderboard — compact inline strip that sits directly under the HUD
 * in multiplayer Blast. Renders:
 *   (1) a persistent horizontal ranking pill per player, and
 *   (2) a transient "opponent found word" flash so the round feels shared.
 *
 * Positioned inline (not absolute) so it can never overlap the HUD on
 * notched devices where `pt-safe` pushes the HUD below the old 56px offset.
 */
export const BlastMPLeaderboard = memo(function BlastMPLeaderboard({
  leaderboard,
  username,
}: BlastMPLeaderboardProps) {
  const opponentActivity = useBlastOpponentActivity();

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

  if (!leaderboard || leaderboard.length === 0) return null;

  const sorted = [...leaderboard].sort((a, b) => b.score - a.score).slice(0, 4);
  const latestActivity = opponentActivity[opponentActivity.length - 1] ?? null;

  return (
    <div className="relative shrink-0 px-2 pt-1.5 pb-1" data-testid="blast-mp-leaderboard">
      {/* Compact horizontal pill row */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {sorted.map((entry, i) => {
          const isMe = entry.username === username;
          const isFlashing = flashingUser === entry.username && !isMe;
          return (
            <m.div
              key={entry.username}
              animate={
                isFlashing
                  ? { scale: [1, 1.12, 1], boxShadow: ['0 0 0 rgba(0,255,255,0)', '0 0 12px rgba(0,255,255,0.8)', '0 0 0 rgba(0,255,255,0)'] }
                  : { scale: 1 }
              }
              transition={{ duration: 0.9, ease: 'easeOut' }}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-neo text-[11px] font-bold tabular-nums shrink-0',
                'border-2 border-neo-black shadow-hard-sm',
                isMe
                  ? 'bg-neo-lime text-neo-navy'
                  : isFlashing
                    ? 'bg-neo-cyan/80 text-neo-navy'
                    : 'bg-neo-navy/85 text-neo-white',
              )}
              aria-label={`#${i + 1} ${entry.username} ${entry.score}`}
            >
              <span className="opacity-60 w-3 text-center">{i + 1}</span>
              <span className="truncate max-w-[72px]">{entry.username}</span>
              <span className="ms-auto">{entry.score}</span>
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
