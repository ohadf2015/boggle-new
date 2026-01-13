'use client';

import React, { useState, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRankIconString, getRankStyle } from '@/utils/rankingStyles';
import Avatar from '../Avatar';
import { MobileDrawer } from '../layout/MobileDrawer';
import type { Avatar as AvatarType, PresenceStatus } from '@/shared/types/game';

interface LeaderboardPlayer {
  username: string;
  score: number;
  wordCount?: number;
  isHost?: boolean;
  isBot?: boolean;
  avatar?: AvatarType;
  presenceStatus?: PresenceStatus;
}

interface MobileLeaderboardProps {
  leaderboard: LeaderboardPlayer[];
  currentUsername: string;
  t: (path: string, params?: Record<string, string | number>) => string;
  dir?: 'rtl' | 'ltr';
}

/**
 * Mobile-friendly floating leaderboard for during gameplay
 * Shows a compact mini-view that expands to full leaderboard in a drawer
 */
const MobileLeaderboard = memo<MobileLeaderboardProps>(({
  leaderboard,
  currentUsername,
  t,
  dir = 'ltr',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate player's rank and score
  const playerData = useMemo(() => {
    const playerIndex = leaderboard.findIndex(p => p.username === currentUsername);
    const playerEntry = leaderboard[playerIndex];
    return {
      rank: playerIndex >= 0 ? playerIndex + 1 : null,
      score: playerEntry?.score ?? 0,
      isTop3: playerIndex >= 0 && playerIndex < 3,
    };
  }, [leaderboard, currentUsername]);

  // Get top 3 players for mini-view
  const top3 = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);

  // Ranking utilities imported from @/utils/rankingStyles

  if (leaderboard.length === 0) return null;

  return (
    <>
      {/* Floating Mini-Leaderboard - Mobile Only */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'md:hidden fixed bottom-24 z-30 safe-area-bottom',
          dir === 'rtl' ? 'left-3' : 'right-3'
        )}
      >
        <button
          onClick={() => setIsExpanded(true)}
          className={cn(
            'bg-neo-cream border-3 border-neo-black rounded-neo-lg shadow-hard',
            'p-2 flex flex-col gap-1 min-w-[140px]',
            'hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard-lg',
            'active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-sm',
            'transition-all duration-100 touch-manipulation'
          )}
          aria-label={t('playerView.showLeaderboard') || 'Show leaderboard'}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b-2 border-neo-black/20 pb-1 mb-1">
            <div className="flex items-center gap-1">
              <Trophy className="w-4 h-4 text-neo-lime" style={{ filter: 'drop-shadow(1px 1px 0px rgb(var(--neo-black)))' }} />
              <span className="text-[10px] font-black uppercase text-neo-black/90">
                {t('playerView.rankings') || 'Rankings'}
              </span>
            </div>
            <ChevronUp className="w-3 h-3 text-neo-black/90" />
          </div>

          {/* Top 3 Mini-List */}
          <div className="space-y-1">
            {top3.map((player, index) => (
              <div
                key={player.username}
                className={cn(
                  'flex items-center gap-1.5 px-1.5 py-0.5 rounded-neo text-xs',
                  player.username === currentUsername && 'ring-2 ring-neo-cyan ring-offset-1',
                  getRankStyle(index)
                )}
              >
                <span className="font-black w-5 text-center text-[10px]">
                  {getRankIconString(index)}
                </span>
                <span className="flex-1 font-bold truncate max-w-[80px] text-[11px]">
                  {player.username === currentUsername ? (t('playerView.me') || 'You') : player.username}
                </span>
                <span className="font-black text-[11px]">{player.score}</span>
              </div>
            ))}
          </div>

          {/* Player's rank if not in top 3 */}
          {playerData.rank && playerData.rank > 3 && (
            <>
              <div className="text-center text-neo-black/90 text-[10px]">⋯</div>
              <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-neo text-xs bg-neo-cyan ring-2 ring-neo-black">
                <span className="font-black w-5 text-center text-[10px]">
                  #{playerData.rank}
                </span>
                <span className="flex-1 font-bold truncate max-w-[80px] text-[11px] text-neo-black">
                  {t('playerView.me') || 'You'}
                </span>
                <span className="font-black text-[11px] text-neo-black">{playerData.score}</span>
              </div>
            </>
          )}
        </button>
      </motion.div>

      {/* Full Leaderboard Drawer */}
      <MobileDrawer
        isOpen={isExpanded}
        onClose={() => setIsExpanded(false)}
        title={t('playerView.leaderboard') || 'Leaderboard'}
        height="half"
      >
        {/* Helpful tip for new players */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-neo-black/60 text-center mb-3 px-2"
        >
          {t('leaderboard.multiplayerTip') || 'Find unique words to score! Words others find count as 0.'}
        </motion.p>

        <div className="space-y-2">
          {leaderboard.map((player, index) => (
            <motion.div
              key={player.username}
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.03 }}
              className={cn(
                'flex items-center gap-3 p-2 rounded-neo border-3 border-neo-black shadow-hard-sm',
                player.username === currentUsername && 'ring-2 ring-neo-cyan ring-offset-1',
                getRankStyle(index),
                dir === 'rtl' && 'flex-row-reverse'
              )}
            >
              {/* Rank badge */}
              <div className="w-9 h-9 rounded-neo flex items-center justify-center font-black text-base bg-neo-black text-neo-cream border-2 border-neo-black">
                {getRankIconString(index)}
              </div>

              {/* Avatar */}
              <Avatar
                profilePictureUrl={player.avatar?.profilePictureUrl ?? undefined}
                avatarImage={player.avatar?.avatarImage}
                size="2xl"
              />

              {/* Player info */}
              <div className="flex-1 min-w-0">
                <div className={cn('font-black truncate text-sm flex items-center gap-1', dir === 'rtl' && 'flex-row-reverse')}>
                  {player.isHost && <Crown className="w-4 h-4 text-neo-lime flex-shrink-0" style={{ filter: 'drop-shadow(1px 1px 0px rgb(var(--neo-black)))' }} />}
                  <span className="truncate">{player.username}</span>
                  {player.username === currentUsername && (
                    <span className="text-[10px] bg-neo-black text-neo-cream px-1.5 py-0.5 rounded-neo font-bold flex-shrink-0">
                      {t('playerView.me') || 'YOU'}
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-neo-black/90">
                  {player.wordCount || 0} {t('hostView.words') || 'words'}
                </div>
              </div>

              {/* Score */}
              <div className="text-right">
                <div className="text-lg font-black text-neo-black leading-none">
                  {player.score}
                </div>
                <div className="text-[9px] font-bold text-neo-black uppercase">pts</div>
              </div>
            </motion.div>
          ))}
        </div>
      </MobileDrawer>
    </>
  );
});

MobileLeaderboard.displayName = 'MobileLeaderboard';

export default MobileLeaderboard;
