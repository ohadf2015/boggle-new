'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Zap, Target, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import Avatar from '../Avatar';

export interface CompactPlayer {
  username: string;
  score: number;
  rank: number;
  isCurrentUser?: boolean;
  profilePictureUrl?: string | null;
  avatarImage?: string;
  avatarEmoji?: string;
  avatarColor?: string;
  previousRank?: number;
}

interface CompactLeaderboardProps {
  players: CompactPlayer[];
  currentUsername: string;
  className?: string;
  t: (key: string) => string;
}

/**
 * CompactLeaderboard - Race Track Style competitive leaderboard
 *
 * Focused on motivation and competition:
 * - Shows the leader (if not you) with crown
 * - Shows your next target (player directly ahead to beat)
 * - Shows your position with "X pts to catch up" indicator
 * - Animated score gaps and rank changes
 */
export function CompactLeaderboard({
  players,
  currentUsername,
  className,
  t,
}: CompactLeaderboardProps) {
  const { leader, nextTarget, currentUser, totalPlayers, isLeading } = useMemo(() => {
    const sorted = [...players].sort((a, b) => b.score - a.score);

    // Add ranks
    sorted.forEach((player, index) => {
      player.rank = index + 1;
    });

    const user = sorted.find(p => p.username === currentUsername);
    const userIndex = sorted.findIndex(p => p.username === currentUsername);
    const leaderPlayer = sorted[0];

    // Next target is the player directly above the current user
    const target = userIndex > 0 ? sorted[userIndex - 1] : null;

    // Check if user is leading
    const leading = user?.rank === 1;

    return {
      leader: leaderPlayer,
      nextTarget: target,
      currentUser: user || null,
      totalPlayers: sorted.length,
      isLeading: leading,
    };
  }, [players, currentUsername]);

  // Calculate points needed to catch next target
  const pointsToTarget = useMemo(() => {
    if (!currentUser || !nextTarget) return 0;
    return nextTarget.score - currentUser.score + 1; // +1 to pass, not tie
  }, [currentUser, nextTarget]);

  // Calculate points ahead of second place (when leading)
  const pointsAhead = useMemo(() => {
    if (!isLeading || totalPlayers < 2) return 0;
    const sorted = [...players].sort((a, b) => b.score - a.score);
    return sorted[0].score - (sorted[1]?.score || 0);
  }, [isLeading, players, totalPlayers]);

  if (totalPlayers === 0 || !currentUser) return null;

  return (
    <div className={cn(
      'bg-neo-cream border-3 border-neo-black rounded-neo-lg shadow-hard overflow-hidden',
      className
    )}>
      {/* Compact Header with Race Track theme */}
      <div className="bg-neo-navy px-2 py-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-neo-yellow" />
          <span className="text-[10px] font-black uppercase text-neo-cream tracking-wider">
            {t('leaderboard.liveRace') || 'Live Race'}
          </span>
        </div>
        <span className="text-[10px] font-bold text-neo-cream/70">
          {totalPlayers} {t('leaderboard.racing') || 'racing'}
        </span>
      </div>

      <div className="p-1.5 space-y-1">
        {/* LEADER SECTION - Only show if user is NOT leading */}
        {!isLeading && leader && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5 px-1.5 py-1 rounded-neo bg-gradient-to-r from-neo-yellow to-neo-orange border-2 border-neo-black shadow-hard-sm"
          >
            {/* Crown Icon */}
            <div className="w-7 h-7 rounded-full bg-neo-black flex items-center justify-center flex-shrink-0">
              <Crown className="w-4 h-4 text-neo-yellow" />
            </div>

            {/* Avatar */}
            <Avatar
              profilePictureUrl={leader.profilePictureUrl ?? undefined}
              avatarImage={leader.avatarImage}
              avatarEmoji={leader.avatarEmoji}
              avatarColor={leader.avatarColor}
              size="sm"
            />

            {/* Name */}
            <div className="flex-1 min-w-0">
              <span className="text-xs font-black text-neo-black truncate block">
                {leader.username}
              </span>
              <span className="text-[9px] font-bold text-neo-black/70 uppercase">
                {t('leaderboard.leader') || 'Leader'}
              </span>
            </div>

            {/* Score */}
            <motion.div
              key={leader.score}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="text-lg font-black text-neo-black tabular-nums"
            >
              {leader.score}
            </motion.div>
          </motion.div>
        )}

        {/* NEXT TARGET - The player you need to beat (if not the leader) */}
        {nextTarget && nextTarget.username !== leader?.username && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 }}
            className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-neo bg-neo-cream border-2 border-neo-black/30"
          >
            {/* Target Icon */}
            <div className="w-6 h-6 rounded-full bg-neo-pink/20 flex items-center justify-center flex-shrink-0">
              <Target className="w-3.5 h-3.5 text-neo-pink" />
            </div>

            {/* Avatar */}
            <Avatar
              profilePictureUrl={nextTarget.profilePictureUrl ?? undefined}
              avatarImage={nextTarget.avatarImage}
              avatarEmoji={nextTarget.avatarEmoji}
              avatarColor={nextTarget.avatarColor}
              size="sm"
            />

            {/* Name & Rank */}
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-bold text-neo-black/80 truncate block">
                #{nextTarget.rank} {nextTarget.username}
              </span>
            </div>

            {/* Score */}
            <span className="text-sm font-black text-neo-black/70 tabular-nums">
              {nextTarget.score}
            </span>
          </motion.div>
        )}

        {/* YOUR POSITION - Always shown prominently */}
        <motion.div
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={cn(
            'relative flex items-center gap-1.5 px-1.5 py-1.5 rounded-neo border-3',
            isLeading
              ? 'bg-gradient-to-r from-neo-yellow to-neo-lime border-neo-black shadow-hard'
              : 'bg-neo-cyan/20 border-neo-cyan shadow-hard-sm'
          )}
        >
          {/* Rank Badge */}
          <div className={cn(
            'w-8 h-8 rounded-neo flex items-center justify-center font-black text-sm flex-shrink-0 border-2 border-neo-black',
            isLeading ? 'bg-neo-black text-neo-yellow' : 'bg-neo-cyan text-neo-black'
          )}>
            {isLeading ? (
              <Crown className="w-4 h-4" />
            ) : (
              `#${currentUser.rank}`
            )}
          </div>

          {/* Avatar */}
          <Avatar
            profilePictureUrl={currentUser.profilePictureUrl ?? undefined}
            avatarImage={currentUser.avatarImage}
            avatarEmoji={currentUser.avatarEmoji}
            avatarColor={currentUser.avatarColor}
            size="sm"
          />

          {/* Name & Status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-xs font-black text-neo-black truncate">
                {t('leaderboard.you') || 'YOU'}
              </span>
              {isLeading && (
                <span className="text-[9px] font-bold text-neo-black/80 uppercase">
                  🔥 {t('leaderboard.leading') || 'Leading!'}
                </span>
              )}
            </div>

            {/* Motivational indicator */}
            <AnimatePresence mode="wait">
              {isLeading ? (
                pointsAhead > 0 && (
                  <motion.span
                    key="ahead"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-[10px] font-bold text-neo-black/70"
                  >
                    +{pointsAhead} pts {t('leaderboard.ahead') || 'ahead'}
                  </motion.span>
                )
              ) : (
                pointsToTarget > 0 && (
                  <motion.div
                    key="catchup"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-0.5"
                  >
                    <ChevronUp className="w-3 h-3 text-neo-pink" />
                    <span className="text-[10px] font-bold text-neo-pink">
                      {pointsToTarget} {t('leaderboard.toCatch') || 'pts to pass'}
                    </span>
                  </motion.div>
                )
              )}
            </AnimatePresence>
          </div>

          {/* Your Score - Animated */}
          <motion.div
            key={currentUser.score}
            initial={{ scale: 1.4, color: '#FF1493' }}
            animate={{ scale: 1, color: '#000000' }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className="text-xl font-black tabular-nums"
          >
            {currentUser.score}
          </motion.div>

          {/* Progress indicator line (visual gap to target) */}
          {!isLeading && nextTarget && pointsToTarget > 0 && (
            <motion.div
              className="absolute -top-0.5 left-0 right-0 h-1 bg-neo-black/10 rounded-full overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="h-full bg-gradient-to-r from-neo-cyan to-neo-pink rounded-full"
                initial={{ width: '0%' }}
                animate={{
                  width: `${Math.min(100, Math.max(10, (currentUser.score / (nextTarget.score || 1)) * 100))}%`
                }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default CompactLeaderboard;
