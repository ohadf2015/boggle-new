'use client';

import { useMemo, useRef, useEffect, useState, useCallback, memo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Crown, Zap, TrendingUp, Flame, Gem, Snowflake, Bomb, Keyboard, MousePointer, Hand } from 'lucide-react';
import { cn } from '@/lib/utils';
import Avatar from '../Avatar';
import PlayerProfileTooltip from '../ui/PlayerProfileTooltip';
import { fireConfetti, NEO_BRUTALIST_COLORS, NEO_BRUTALIST_SHAPES } from '@/utils/confettiUtils';

export interface CompactPlayer {
  username: string;
  score: number;
  rank: number;
  isCurrentUser?: boolean;
  avatarImage?: string;
  customAvatar?: import('@/shared/types/customAvatar').CustomAvatarConfig | null;
  avatarEmoji?: string;
  avatarColor?: string;
  previousRank?: number;
  /** Last input method used by this player */
  inputMethod?: 'keyboard' | 'click' | 'drag' | null;
}

export interface ComboEvent {
  username: string;
  comboType: string;
}

interface CompactLeaderboardProps {
  players: CompactPlayer[];
  currentUsername: string;
  className?: string;
  t: (key: string) => string;
  comboEvent?: ComboEvent | null;
}

// Track previous scores for detecting changes
interface ScoreChange {
  username: string;
  delta: number;
  timestamp: number;
}

// Rapid scoring window — if 3+ scores within this window, show streak flame
const STREAK_WINDOW_MS = 10000;
const STREAK_THRESHOLD = 3;

// Debounce interval for visual updates (ms) - prevents state cascade
const VISUAL_UPDATE_DEBOUNCE = 100;

/**
 * CompactLeaderboard - Race Track Style competitive leaderboard
 *
 * Enhanced with visual race track, animations, and live activity indicators:
 * - Horizontal race lanes showing relative positions
 * - Animated position changes when ranks swap
 * - Visual "catching up" effects when gap narrows
 * - Pulse animations when opponents score
 * - Rank change indicators (up/down arrows)
 */
/** Map combo type to icon */
function getComboIcon(comboType: string) {
  switch (comboType) {
    case 'gem': return <Gem className="w-3 h-3 text-neo-pink" />;
    case 'frozen': return <Snowflake className="w-3 h-3 text-neo-cyan" />;
    case 'bomb': return <Bomb className="w-3 h-3 text-neo-red" />;
    default: return <Zap className="w-3 h-3 text-neo-lime" />;
  }
}

export const CompactLeaderboard = memo<CompactLeaderboardProps>(function CompactLeaderboard({
  players,
  currentUsername,
  className,
  t,
  comboEvent,
}) {
  // Track previous scores and ranks for animations
  const prevScoresRef = useRef<Map<string, number>>(new Map());
  const prevRanksRef = useRef<Map<string, number>>(new Map());
  const [scoreChanges, setScoreChanges] = useState<ScoreChange[]>([]);
  const [rankChanges, setRankChanges] = useState<Map<string, 'up' | 'down'>>(new Map());
  // Track score event history per opponent for streak detection
  const scoreHistoryRef = useRef<Map<string, number[]>>(new Map());

  const { sortedPlayers, nextTarget, currentUser, totalPlayers, isLeading, maxScore } = useMemo(() => {
    const sorted = [...players].sort((a, b) => b.score - a.score);

    // Add ranks
    sorted.forEach((player, index) => {
      player.rank = index + 1;
    });

    const user = sorted.find(p => p.username === currentUsername);
    const userIndex = sorted.findIndex(p => p.username === currentUsername);
    const highestScore = sorted[0]?.score || 0;

    // Next target is the player directly above the current user
    const target = userIndex > 0 ? sorted[userIndex - 1] : null;

    // Check if user is leading
    const leading = user?.rank === 1;

    return {
      sortedPlayers: sorted,
      nextTarget: target,
      currentUser: user || null,
      totalPlayers: sorted.length,
      isLeading: leading,
      maxScore: highestScore,
    };
  }, [players, currentUsername]);

  // Refs to track pending updates and avoid state cascade
  const pendingUpdateRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scoreCleanupRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rankCleanupRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect score and rank changes for animations (debounced to prevent cascade)
  useEffect(() => {
    // Cancel any pending update to debounce rapid changes
    if (pendingUpdateRef.current) {
      clearTimeout(pendingUpdateRef.current);
    }

    pendingUpdateRef.current = setTimeout(() => {
      const newScoreChanges: ScoreChange[] = [];
      const newRankChanges = new Map<string, 'up' | 'down'>();

      sortedPlayers.forEach(player => {
        const prevScore = prevScoresRef.current.get(player.username);
        const prevRank = prevRanksRef.current.get(player.username);

        // Detect score change
        if (prevScore !== undefined && player.score > prevScore) {
          const now = Date.now();
          newScoreChanges.push({
            username: player.username,
            delta: player.score - prevScore,
            timestamp: now,
          });

          // Track score event for streak detection (opponents only)
          if (player.username !== currentUsername) {
            const history = scoreHistoryRef.current.get(player.username) || [];
            history.push(now);
            // Keep only events within the streak window
            const cutoff = now - STREAK_WINDOW_MS;
            scoreHistoryRef.current.set(player.username, history.filter(t => t > cutoff));
          }
        }

        // Detect rank change
        if (prevRank !== undefined && player.rank !== prevRank) {
          newRankChanges.set(player.username, player.rank < prevRank ? 'up' : 'down');
        }

        // Update refs
        prevScoresRef.current.set(player.username, player.score);
        prevRanksRef.current.set(player.username, player.rank);
      });

      // Batch state updates together
      if (newScoreChanges.length > 0 || newRankChanges.size > 0) {
        if (newScoreChanges.length > 0) {
          setScoreChanges(prev => [...prev, ...newScoreChanges]);
          // Clear previous cleanup timeout
          if (scoreCleanupRef.current) clearTimeout(scoreCleanupRef.current);
          scoreCleanupRef.current = setTimeout(() => {
            setScoreChanges(prev => prev.filter(c => Date.now() - c.timestamp < 1500));
          }, 1500);
        }

        if (newRankChanges.size > 0) {
          setRankChanges(newRankChanges);
          // Clear previous cleanup timeout
          if (rankCleanupRef.current) clearTimeout(rankCleanupRef.current);
          rankCleanupRef.current = setTimeout(() => setRankChanges(new Map()), 2000);
        }
      }
    }, VISUAL_UPDATE_DEBOUNCE);

    // Cleanup on unmount
    return () => {
      if (pendingUpdateRef.current) clearTimeout(pendingUpdateRef.current);
      if (scoreCleanupRef.current) clearTimeout(scoreCleanupRef.current);
      if (rankCleanupRef.current) clearTimeout(rankCleanupRef.current);
    };
  }, [sortedPlayers, currentUsername]);

  // Calculate points needed to catch next target
  const pointsToTarget = useMemo(() => {
    if (!currentUser || !nextTarget) return 0;
    return nextTarget.score - currentUser.score + 1; // +1 to pass, not tie
  }, [currentUser, nextTarget]);

  // Calculate points ahead of second place (when leading)
  const pointsAhead = useMemo(() => {
    if (!isLeading || totalPlayers < 2) return 0;
    return sortedPlayers[0].score - (sortedPlayers[1]?.score || 0);
  }, [isLeading, sortedPlayers, totalPlayers]);

  // Check if close to overtaking (for pulse animation)
  const isCloseToOvertaking = pointsToTarget > 0 && pointsToTarget <= 5;

  // Get race position percentage (0-100) for visual track
  const getRacePosition = (score: number): number => {
    if (maxScore === 0) return 0;
    return Math.min(100, (score / maxScore) * 100);
  };

  // Check if an opponent is on a scoring streak
  const isOnStreak = useCallback((username: string): boolean => {
    if (username === currentUsername) return false;
    const history = scoreHistoryRef.current.get(username);
    return !!history && history.length >= STREAK_THRESHOLD;
  }, [currentUsername]);

  // Fire a small ego-confetti burst when the player clicks on themselves
  const handleSelfClick = useCallback((e: React.MouseEvent) => {
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    fireConfetti({
      particleCount: 25,
      spread: 60,
      origin: { x, y },
      colors: NEO_BRUTALIST_COLORS,
      shapes: NEO_BRUTALIST_SHAPES,
      flat: true,
      scalar: 1.3,
      startVelocity: 35,
      ticks: 120,
    });
  }, []);

  // Get top 3 OTHER players for race visualization (exclude current user)
  const raceParticipants = useMemo(
    () => sortedPlayers.filter(p => p.username !== currentUsername).slice(0, 3),
    [sortedPlayers, currentUsername],
  );

  if (totalPlayers === 0 || !currentUser) return null;

  return (
    <div className={cn(
      'bg-neo-cream border-3 border-neo-black rounded-neo-lg shadow-hard overflow-hidden',
      className
    )}>
      {/* Header with Race Track theme */}
      <div className="bg-neo-navy text-neo-white px-2 py-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div
            data-anim="zap-wiggle"
            className="motion-safe:animate-zap-wiggle"
          >
            <Zap className="w-3.5 h-3.5 text-neo-lime" />
          </div>
          <span className="text-[10px] font-black uppercase text-neo-white tracking-wider">
            {t('leaderboard.liveRace')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold text-neo-white">
            {totalPlayers} {t('leaderboard.racing')}
          </span>
        </div>
      </div>

      {/* First-time hint - shows briefly */}
      {totalPlayers > 1 && (
        <m.div
          initial={{ opacity: 1, height: 'auto' }}
          animate={{ opacity: 0, height: 0 }}
          transition={{ delay: 5, duration: 0.5 }}
          className="px-2 py-1 bg-neo-cyan/20 text-[9px] text-neo-black font-medium text-center overflow-hidden"
        >
          {t('leaderboard.hint')}
        </m.div>
      )}

      {/* Race Track Visualization */}
      <div className="px-2 py-1.5 bg-linear-to-b from-neo-navy/5 to-transparent">
        {/* Track lanes */}
        <div className="relative space-y-1" role="list">
          {raceParticipants.map((player) => {
            const isMe = player.username === currentUsername;
            const isLeader = player.rank === 1;
            const position = getRacePosition(player.score);
            const scoreChange = scoreChanges.find(c => c.username === player.username);
            const rankChange = rankChanges.get(player.username);

            return (
              <div
                key={player.username}
                role="listitem"
                tabIndex={0}
                onClick={isMe ? handleSelfClick : undefined}
                className={cn(
                  'relative flex items-center gap-1.5 h-10 rounded-neo overflow-hidden transition-all duration-200',
                  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-1',
                  'hover:bg-neo-black/10',
                  isMe
                    ? 'bg-neo-cyan/30 border-2 border-neo-cyan hover:bg-neo-cyan/40 cursor-pointer active:scale-[0.98]'
                    : 'bg-neo-black/5 border border-neo-black/20'
                )}
              >
                {/* Track background with finish line pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute right-0 top-0 bottom-0 w-2 bg-[repeating-linear-gradient(0deg,#000,#000_2px,#fff_2px,#fff_4px)]" />
                </div>

                {/* Position indicator (race car on track) — static, no spring animation */}
                <div
                  className="absolute top-0 bottom-0 flex items-center transition-[left] duration-500 ease-out"
                  style={{ left: `${Math.max(0, position - 15)}%` }}
                >
                  {/* Player marker */}
                  <div className={cn(
                    'flex items-center gap-1 px-1.5 py-0.5 rounded-neo',
                    isLeader
                      ? 'bg-linear-to-r from-neo-lime to-neo-cyan border-2 border-neo-black shadow-hard-sm'
                      : isMe
                        ? 'bg-neo-cyan border-2 border-neo-black shadow-hard-sm'
                        : 'bg-neo-cream border border-neo-black/50'
                  )}>
                    {/* Rank indicator */}
                    {isLeader ? (
                      <Crown className="w-3 h-3 text-neo-black" />
                    ) : (
                      <span className="text-[9px] font-black text-neo-black">
                        #{player.rank}
                      </span>
                    )}

                    {/* Avatar */}
                    <Avatar

                      avatarImage={player.avatarImage}
                      customAvatar={player.customAvatar}
                      size="md"
                      disableEffects tierMarker
                    />

                    {/* Score */}
                    <span className="text-xs font-black text-neo-black tabular-nums">
                      {player.score}
                    </span>

                    {/* Rank change indicator */}
                    <AnimatePresence>
                      {rankChange && (
                        <m.span
                          initial={{ opacity: 0, y: rankChange === 'up' ? 5 : -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                          className={cn(
                            'text-[9px] font-black',
                            rankChange === 'up' ? 'text-neo-lime' : 'text-neo-red'
                          )}
                        >
                          {rankChange === 'up' ? '▲' : '▼'}
                        </m.span>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Score change floating indicator */}
                  <AnimatePresence>
                    {scoreChange && (
                      <m.div
                        initial={{ opacity: 0, y: 0, x: 5 }}
                        animate={{ opacity: 1, y: -15, x: 5 }}
                        exit={{ opacity: 0, y: -25 }}
                        transition={{ duration: 0.8 }}
                        className="absolute -top-1 left-full text-[10px] font-black text-neo-lime whitespace-nowrap"
                      >
                        +{scoreChange.delta}
                      </m.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Player name (right side) + streak flame + combo badge */}
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                  {/* Combo event badge */}
                  <AnimatePresence>
                    {comboEvent && comboEvent.username === player.username && comboEvent.username !== currentUsername && (
                      <m.div
                        key={`combo-${player.username}`}
                        data-testid={`combo-badge-${player.username}`}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [1, 1.3, 1], opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        {getComboIcon(comboEvent.comboType)}
                      </m.div>
                    )}
                  </AnimatePresence>
                  {isOnStreak(player.username) && (
                    <div className="motion-safe:animate-streak-pulse">
                      <Flame className="w-3 h-3 text-neo-orange" />
                    </div>
                  )}
                  {player.inputMethod && (
                    <span className="text-neo-black/40" title={player.inputMethod}>
                      {player.inputMethod === 'keyboard' ? <Keyboard className="w-2.5 h-2.5" /> :
                       player.inputMethod === 'click' ? <MousePointer className="w-2.5 h-2.5" /> :
                       <Hand className="w-2.5 h-2.5" />}
                    </span>
                  )}
                  <PlayerProfileTooltip
                    player={{
                      username: player.username,
                      avatarImage: player.avatarImage,
                      customAvatar: player.customAvatar,
                      score: player.score,
                    }}
                    isCurrentUser={isMe}
                    side="bottom"
                  >
                    <span
                      title={isMe ? undefined : player.username}
                      className={cn(
                        'text-[10px] font-bold truncate max-w-[60px]',
                        isMe ? 'text-neo-black' : 'text-neo-black/80 cursor-pointer hover:text-neo-black hover:underline'
                      )}
                    >
                      {isMe ? (t('leaderboard.you')) : player.username}
                    </span>
                  </PlayerProfileTooltip>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Your Status Bar - Motivational section */}
      <div className="px-2 pb-1.5">
        <div
          data-anim={isCloseToOvertaking ? 'overtake-pulse' : undefined}
          className={cn(
            'relative flex items-center justify-between px-2 py-1.5 rounded-neo border-2',
            isLeading
              ? 'bg-linear-to-r from-neo-lime/50 to-neo-lime/50 border-neo-black'
              : isCloseToOvertaking
                ? 'bg-neo-pink/20 border-neo-pink motion-safe:animate-overtake-pulse'
                : 'bg-neo-cyan/10 border-neo-cyan/50'
          )}
        >
          {/* Left side - status */}
          <div className="flex items-center gap-1.5">
            {isLeading ? (
              <>
                <Flame className="w-4 h-4 text-neo-pink" />
                <span className="text-xs font-black text-neo-black">
                  {t('leaderboard.leading')}
                </span>
                {pointsAhead > 0 && (
                  <span className="text-[10px] font-bold text-neo-black/80">
                    +{pointsAhead} {t('leaderboard.ahead')}
                  </span>
                )}
              </>
            ) : (
              <>
                <TrendingUp className={cn(
                  'w-4 h-4',
                  isCloseToOvertaking ? 'text-neo-pink animate-pulse' : 'text-neo-cyan'
                )} />
                <span className={cn(
                  'text-xs font-black',
                  isCloseToOvertaking ? 'text-neo-pink' : 'text-neo-black/80'
                )}>
                  {isCloseToOvertaking
                    ? (t('leaderboard.almostThere'))
                    : `${pointsToTarget} ${t('leaderboard.toCatch')}`
                  }
                </span>
              </>
            )}
          </div>

          {/* Right side - your score */}
          <m.div
            key={currentUser.score}
            initial={{ scale: 1.4 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className="flex items-center gap-1"
          >
            <span className="text-[10px] font-bold text-neo-black/80 uppercase">
              {t('common.score')}
            </span>
            <span className="text-lg font-black text-neo-black tabular-nums">
              {currentUser.score}
            </span>
          </m.div>

          {/* Progress bar to next target */}
          {!isLeading && nextTarget && (
            <div
              className="absolute -bottom-0.5 left-2 right-2 h-1 bg-neo-black/10 rounded-full overflow-hidden"
            >
              <div
                className={cn(
                  'h-full rounded-full transition-[width] duration-500 ease-out',
                  isCloseToOvertaking
                    ? 'bg-linear-to-r from-neo-pink to-neo-red'
                    : 'bg-linear-to-r from-neo-cyan to-neo-pink'
                )}
                style={{
                  width: `${Math.min(100, Math.max(5, (currentUser.score / (nextTarget.score || 1)) * 100))}%`,
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

CompactLeaderboard.displayName = 'CompactLeaderboard';

export default CompactLeaderboard;
