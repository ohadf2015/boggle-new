'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Crown, Trophy, SmilePlus } from 'lucide-react';
import { m, useReducedMotion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { PlayerScore } from '@/hooks/useResultsData';
import Avatar from '../Avatar';
import { REACTIONS } from '@/components/game/QuickReactions';
import { AddFriendBadge } from '@/components/results/ResultsFriendStatus';

/** Emoji bubble that floats above a targeted podium player */
interface PodiumBubble {
  id: string;
  emoji: string;
  targetUsername: string;
}

interface ResultsPodiumProps {
  /** Top 3 players sorted by rank */
  players: PlayerScore[];
  /** Current player's username (to highlight with "YOU" label) */
  currentUsername?: string;
  /** Whether this is Word Hunt mode (show words found instead of score) */
  isWordHunt?: boolean;
  /** Translation function */
  t: (key: string) => string | undefined;
  /** Callback when an emoji is sent to a player */
  onReaction?: (reactionId: string, targetUsername: string) => void;
}

const PODIUM_CONFIG = [
  {
    order: 1,
    place: 2,
    bgClass: 'bg-neo-cyan',
    borderClass: 'border-neo-cyan',
    textClass: 'text-neo-cyan',
    ptOffset: 'pt-8 medium-short:pt-4',
    avatarSize: 'w-12 h-12 sm:w-14 sm:h-14 medium-short:w-10 medium-short:h-10',
    badgeSize: 'w-6 h-6 text-[10px]',
    nameSize: 'text-[10px]',
    scoreSize: 'text-[9px]',
    barHeight: 'h-20 medium-short:h-14',
    barText: 'text-2xl sm:text-4xl medium-short:text-xl',
    shadow: 'shadow-hard-sm',
    borderWidth: 'border-2',
  },
  {
    order: 0,
    place: 1,
    bgClass: 'bg-neo-lime',
    borderClass: 'border-neo-lime',
    textClass: 'text-neo-lime',
    ptOffset: '',
    avatarSize: 'w-14 h-14 sm:w-16 sm:h-16 medium-short:w-12 medium-short:h-12',
    badgeSize: '',
    nameSize: 'text-[11px]',
    scoreSize: 'text-[10px]',
    barHeight: 'h-32 medium-short:h-20',
    barText: 'text-3xl sm:text-5xl medium-short:text-2xl',
    shadow: 'shadow-hard',
    borderWidth: 'border-2',
  },
  {
    order: 2,
    place: 3,
    bgClass: 'bg-neo-purple',
    borderClass: 'border-neo-purple',
    textClass: 'text-neo-purple',
    ptOffset: 'pt-14 medium-short:pt-7',
    avatarSize: 'w-10 h-10 sm:w-12 sm:h-12 medium-short:w-9 medium-short:h-9',
    badgeSize: 'w-5 h-5 text-[9px]',
    nameSize: 'text-[10px]',
    scoreSize: 'text-[9px]',
    barHeight: 'h-12 medium-short:h-9',
    barText: 'text-xl sm:text-3xl medium-short:text-lg',
    shadow: 'shadow-hard-sm',
    borderWidth: 'border-2',
  },
] as const;

// Layout order: 2nd, 1st, 3rd
const LAYOUT_ORDER = [1, 0, 2] as const;

function formatScore(score: number): string {
  return score.toLocaleString();
}

// Sequenced reveal delays: 2nd place, 1st place (dramatic), 3rd place
const REVEAL_DELAYS = [0.1, 0.35, 0.2] as const;

const THROTTLE_MS = 2000;

/** Emoji speech bubble above a targeted podium player */
function PodiumEmojiBubbleLocal({ emoji, onDone }: { emoji: string; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <m.div
      initial={{ scale: 0, y: 6, opacity: 0 }}
      animate={{ scale: 1, y: -6, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
      className="absolute -top-7 left-1/2 -translate-x-1/2 z-30 bg-neo-cream border-3 border-neo-black rounded-neo shadow-hard-sm px-2 py-0.5 text-lg pointer-events-none"
    >
      {emoji}
      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-neo-cream border-b-3 border-r-3 border-neo-black rotate-45" />
    </m.div>
  );
}

/** Small emoji picker that appears near a podium player — clamped to viewport */
function PodiumEmojiPicker({
  onSelect,
  onClose,
  position,
}: {
  onSelect: (reactionId: string) => void;
  onClose: () => void;
  /** 'left' | 'center' | 'right' — controls horizontal alignment to avoid off-screen */
  position: 'left' | 'center' | 'right';
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Position classes: center by default, shift left/right to stay on-screen
  const positionClass =
    position === 'left' ? 'left-0' :
    position === 'right' ? 'right-0' :
    'left-1/2 -translate-x-1/2';

  return (
    <m.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.7, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.7, y: 4 }}
      transition={{ duration: 0.12 }}
      className={cn("absolute top-full mt-1 z-50 flex gap-0.5 bg-neo-navy/95 border border-neo-white/15 rounded-lg p-1 backdrop-blur-xs shadow-lg", positionClass)}
    >
      {REACTIONS.map((r) => (
        <button
          key={r.id}
          onClick={() => onSelect(r.id)}
          className="w-8 h-8 flex items-center justify-center text-base rounded hover:bg-neo-white/10 active:scale-90 transition-all"
        >
          {r.emoji}
        </button>
      ))}
    </m.div>
  );
}

export default function ResultsPodium({
  players,
  currentUsername,
  isWordHunt = false,
  t,
  onReaction,
}: ResultsPodiumProps) {
  const reducedMotion = useReducedMotion();
  const [openPicker, setOpenPicker] = useState<string | null>(null);
  const lastReactionRef = useRef(0);
  const bubbleIdRef = useRef(0);
  const [bubbles, setBubbles] = useState<PodiumBubble[]>([]);

  const dismissBubble = useCallback((id: string) => {
    setBubbles(prev => prev.filter(b => b.id !== id));
  }, []);

  const handleEmojiSelect = useCallback((reactionId: string, targetUsername: string) => {
    const now = Date.now();
    if (now - lastReactionRef.current < THROTTLE_MS) return;
    lastReactionRef.current = now;

    // Show local bubble on the targeted player's podium
    const reaction = REACTIONS.find(r => r.id === reactionId);
    if (reaction) {
      const id = `pb-${++bubbleIdRef.current}`;
      setBubbles(prev => [...prev, { id, emoji: reaction.emoji, targetUsername }]);
    }

    onReaction?.(reactionId, targetUsername);
    setOpenPicker(null);
  }, [onReaction]);

  if (!players.length) return null;

  const top3 = players.slice(0, 3);

  return (
    <m.div
      className="w-full"
      initial={reducedMotion ? undefined : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Section header */}
      <m.div
        className="flex items-center justify-center gap-1.5 mb-4 medium-short:mb-2"
        initial={reducedMotion ? undefined : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.3 }}
      >
        <Trophy className="w-3.5 h-3.5 text-white" />
        <span className="font-black text-[10px] text-white uppercase tracking-wider">
          {t('results.matchResults') || 'Match Results'}
        </span>
      </m.div>

      <div className="grid grid-cols-3 items-end gap-1 px-1 max-w-xs mx-auto">
        {LAYOUT_ORDER.map((configIdx, layoutIdx) => {
          const config = PODIUM_CONFIG[configIdx];
          // Index by place (1-based) to match rank-sorted players array
          const player = top3[config.place - 1];

          if (!player) {
            return <div key={`empty-${layoutIdx}`} />;
          }

          const isCurrentUser =
            currentUsername &&
            player.username.toLowerCase() === currentUsername.toLowerCase();
          const displayName = isCurrentUser
            ? (t('results.you') || 'YOU')
            : player.username;
          const isFirst = config.place === 1;
          const showEmojiButton = onReaction && !isCurrentUser;

          const scoreDisplay = isWordHunt
            ? `${player.wordsFoundCount ?? 0} ${t('results.words') || 'Words'}`
            : formatScore(player.score);

          const baseDelay = REVEAL_DELAYS[layoutIdx];

          return (
            <m.div
              key={player.username}
              className={cn('flex flex-col items-center', config.ptOffset)}
              initial={reducedMotion ? undefined : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: baseDelay, duration: 0.2 }}
            >
              {/* Emoji bubbles on this player */}
              <div className="relative">
                <AnimatePresence>
                  {bubbles
                    .filter(b => b.targetUsername === player.username)
                    .slice(-2)
                    .map(b => (
                      <PodiumEmojiBubbleLocal
                        key={b.id}
                        emoji={b.emoji}
                        onDone={() => dismissBubble(b.id)}
                      />
                    ))}
                </AnimatePresence>
              </div>

              {/* Avatar — bouncy drop-in */}
              <m.div
                className="relative mb-3 medium-short:mb-1.5"
                initial={reducedMotion ? undefined : { opacity: 0, y: -25, scale: 0.6 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 12,
                  delay: baseDelay,
                }}
              >
                {isFirst && (
                  <m.div
                    className="absolute inset-0 rounded-full bg-neo-lime/20 blur-md"
                    initial={reducedMotion ? undefined : { scale: 0 }}
                    animate={{ scale: [0, 1.3, 1] }}
                    transition={{ delay: baseDelay + 0.3, duration: 0.5 }}
                  />
                )}
                <div
                  className={cn(
                    'relative rounded-full flex items-center justify-center bg-neo-navy',
                    config.avatarSize,
                    isFirst ? 'border-3 border-neo-lime' : cn(config.borderWidth, config.borderClass)
                  )}
                >
                  <Avatar
                    userId={player.username}
                    customAvatar={player.avatar?.customAvatar}
                    size={isFirst ? 'lg' : 'md'}
                    className={cn('w-full h-full rounded-full')}
                  />
                </div>

                {/* Crown for 1st — dramatic spin-in with overshoot */}
                {isFirst ? (
                  <m.div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-neo-lime drop-shadow-md"
                    initial={reducedMotion ? undefined : { scale: 0, rotate: -360, y: -20 }}
                    animate={{ scale: 1, rotate: 0, y: 0 }}
                    transition={{
                      type: 'spring',
                      delay: baseDelay + 0.4,
                      stiffness: 200,
                      damping: 8,
                    }}
                  >
                    <Crown className="w-5 h-5 fill-neo-lime" />
                  </m.div>
                ) : (
                  <m.div
                    initial={reducedMotion ? undefined : { scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', delay: baseDelay + 0.25, stiffness: 400, damping: 15 }}
                    className={cn(
                      'absolute -top-1.5 -right-1.5 text-black rounded-full flex items-center justify-center border-2 border-black shadow-xs font-black',
                      config.badgeSize,
                      config.bgClass
                    )}
                  >
                    {config.place}
                  </m.div>
                )}
              </m.div>

              {/* Name, Score & Emoji button — fade up after avatar */}
              <m.div
                className="text-center mb-3 min-w-0 px-1 relative"
                initial={reducedMotion ? undefined : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20, delay: baseDelay + 0.2 }}
              >
                <p
                  className={cn(
                    'font-black text-white uppercase truncate',
                    config.nameSize
                  )}
                >
                  {displayName}
                </p>
                <m.p
                  initial={reducedMotion ? undefined : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: baseDelay + 0.35 }}
                  className={cn(
                    'font-black mt-0.5',
                    config.scoreSize,
                    config.textClass
                  )}
                >
                  {scoreDisplay}
                </m.p>

                {/* Per-player actions — add-friend (always available) + emoji (when reactions wired) */}
                {!isCurrentUser && (
                  <div className="relative mt-1 flex items-center justify-center gap-1">
                    <AddFriendBadge username={player.username} isBot={(player as { isBot?: boolean }).isBot} />
                    {showEmojiButton && (
                      <>
                        <button
                          onClick={() => setOpenPicker(openPicker === player.username ? null : player.username)}
                          className={cn(
                            'w-7 h-7 flex items-center justify-center rounded-neo',
                            'bg-neo-navy border-2 border-neo-white/20 shadow-hard-sm',
                            'hover:bg-neo-white/10 hover:border-neo-lime/40',
                            'active:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px]',
                            'transition-all',
                            openPicker === player.username && 'bg-neo-lime/15 border-neo-lime/50'
                          )}
                          aria-label={`Send emoji to ${player.username}`}
                        >
                          <SmilePlus className="w-3.5 h-3.5 text-neo-white" />
                        </button>
                        <AnimatePresence>
                          {openPicker === player.username && (
                            <PodiumEmojiPicker
                              onSelect={(id) => handleEmojiSelect(id, player.username)}
                              onClose={() => setOpenPicker(null)}
                              position={layoutIdx === 0 ? 'left' : layoutIdx === 2 ? 'right' : 'center'}
                            />
                          )}
                        </AnimatePresence>
                      </>
                    )}
                  </div>
                )}
              </m.div>

              {/* Podium bar — elastic grow from bottom with slight overshoot */}
              <m.div
                className={cn(
                  'w-full flex items-center justify-center font-neo-display font-black text-black',
                  config.barHeight,
                  config.barText,
                  config.borderWidth,
                  config.shadow,
                  'border-black rounded-t-neo',
                  config.bgClass
                )}
                initial={reducedMotion ? undefined : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 180,
                  damping: 10,
                  delay: baseDelay + 0.15,
                }}
                style={{ transformOrigin: 'bottom' }}
              >
                <m.span
                  initial={reducedMotion ? undefined : { opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15, delay: baseDelay + 0.45 }}
                >
                  {config.place}
                </m.span>
              </m.div>
            </m.div>
          );
        })}
      </div>
    </m.div>
  );
}
