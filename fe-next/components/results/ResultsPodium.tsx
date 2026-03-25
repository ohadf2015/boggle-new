'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Crown, Trophy, SmilePlus, X } from 'lucide-react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { PlayerScore } from '@/hooks/useResultsData';
import Avatar from '../Avatar';
import { REACTIONS } from '@/components/game/QuickReactions';

/** A reaction pinned on a podium player */
interface PinnedReaction {
  id: string;
  reactionId: string;
  emoji: string;
  senderUsername: string;
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
  /** Incoming emoji reactions from other players (via socket) */
  emojiReactions?: Array<{ id: string; emoji: string; username: string; timestamp: number }>;
}

const PODIUM_CONFIG = [
  {
    order: 1,
    place: 2,
    bgClass: 'bg-neo-cyan',
    borderClass: 'border-neo-cyan',
    textClass: 'text-neo-cyan',
    ptOffset: 'pt-8',
    avatarSize: 'w-12 h-12 sm:w-14 sm:h-14',
    badgeSize: 'w-6 h-6 text-[10px]',
    nameSize: 'text-[10px]',
    scoreSize: 'text-[9px]',
    barHeight: 'h-24',
    barText: 'text-2xl sm:text-4xl',
    shadow: 'shadow-hard-sm',
    borderWidth: 'border-2',
    pickerAlign: 'left-0' as const,
  },
  {
    order: 0,
    place: 1,
    bgClass: 'bg-neo-lime',
    borderClass: 'border-neo-lime',
    textClass: 'text-neo-lime',
    ptOffset: '',
    avatarSize: 'w-14 h-14 sm:w-16 sm:h-16',
    badgeSize: '',
    nameSize: 'text-[11px]',
    scoreSize: 'text-[10px]',
    barHeight: 'h-36',
    barText: 'text-3xl sm:text-5xl',
    shadow: 'shadow-hard',
    borderWidth: 'border-2',
    pickerAlign: 'left-1/2 -translate-x-1/2' as const,
  },
  {
    order: 2,
    place: 3,
    bgClass: 'bg-neo-orange',
    borderClass: 'border-neo-orange',
    textClass: 'text-neo-orange',
    ptOffset: 'pt-14',
    avatarSize: 'w-10 h-10 sm:w-12 sm:h-12',
    badgeSize: 'w-5 h-5 text-[9px]',
    nameSize: 'text-[10px]',
    scoreSize: 'text-[9px]',
    barHeight: 'h-16',
    barText: 'text-xl sm:text-3xl',
    shadow: 'shadow-hard-sm',
    borderWidth: 'border-2',
    pickerAlign: 'right-0' as const,
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

/** Emoji picker positioned based on podium column */
function PodiumEmojiPicker({
  onSelect,
  onClose,
  align,
}: {
  onSelect: (reactionId: string) => void;
  onClose: () => void;
  align: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.7, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.7, y: 4 }}
      transition={{ duration: 0.12 }}
      className={cn(
        'absolute bottom-full mb-2 z-50 flex gap-0.5 bg-neo-navy/95 border border-neo-white/15 rounded-lg p-1.5 backdrop-blur-sm shadow-lg',
        align
      )}
    >
      {REACTIONS.map((r) => (
        <button
          key={r.id}
          onClick={() => onSelect(r.id)}
          className="w-9 h-9 flex items-center justify-center text-lg rounded-lg hover:bg-neo-white/10 active:scale-90 transition-all"
        >
          {r.emoji}
        </button>
      ))}
    </motion.div>
  );
}

/** Pinned reaction bubble with sender name (WhatsApp-style) */
function PinnedReactionBubble({
  reaction,
  onRemove,
  canRemove,
}: {
  reaction: PinnedReaction;
  onRemove: (id: string) => void;
  canRemove: boolean;
}) {
  const [showSender, setShowSender] = useState(false);

  return (
    <motion.div
      initial={{ scale: 0, y: 8 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0, y: 8, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      className="relative group"
    >
      <button
        onClick={() => {
          if (canRemove) onRemove(reaction.id);
          else setShowSender(prev => !prev);
        }}
        onMouseEnter={() => setShowSender(true)}
        onMouseLeave={() => setShowSender(false)}
        className={cn(
          'flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border border-neo-white/20 bg-neo-navy/80 backdrop-blur-sm text-sm transition-all',
          canRemove && 'hover:border-red-400/50 hover:bg-red-500/10',
          !canRemove && 'hover:border-neo-white/30'
        )}
      >
        <span>{reaction.emoji}</span>
        {canRemove && (
          <X className="w-2.5 h-2.5 text-white/40 group-hover:text-red-400 transition-colors" />
        )}
      </button>

      {/* Sender tooltip */}
      <AnimatePresence>
        {showSender && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.9 }}
            transition={{ duration: 0.1 }}
            className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap"
          >
            <div className="bg-neo-black/90 text-white text-[9px] font-bold px-2 py-0.5 rounded border border-neo-white/10 shadow-lg">
              {reaction.senderUsername}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ResultsPodium({
  players,
  currentUsername,
  isWordHunt = false,
  t,
  onReaction,
  emojiReactions = [],
}: ResultsPodiumProps) {
  const reducedMotion = useReducedMotion();
  const [openPicker, setOpenPicker] = useState<string | null>(null);
  const lastReactionRef = useRef(0);

  // Pinned reactions state — persists on the podium
  const [pinnedReactions, setPinnedReactions] = useState<PinnedReaction[]>([]);
  const pinnedIdCounter = useRef(0);

  // Track which incoming reactions we've already processed
  const processedIncomingIds = useRef(new Set<string>());

  // Absorb incoming emojiReactions into pinned state
  useEffect(() => {
    if (!emojiReactions.length) return;
    const newReactions: PinnedReaction[] = [];
    for (const r of emojiReactions) {
      if (processedIncomingIds.current.has(r.id)) continue;
      processedIncomingIds.current.add(r.id);
      // Incoming reactions from useQuickReactions don't have a target —
      // show them on the podium generically (on the 1st place player)
      const reaction = REACTIONS.find(rx => rx.emoji === r.emoji);
      if (!reaction) continue;
      newReactions.push({
        id: `incoming-${r.id}`,
        reactionId: reaction.id,
        emoji: r.emoji,
        senderUsername: r.username,
        targetUsername: players[0]?.username || '',
      });
    }
    if (newReactions.length > 0) {
      setPinnedReactions(prev => [...prev, ...newReactions]);
    }
  }, [emojiReactions, players]);

  const handleEmojiSelect = useCallback((reactionId: string, targetUsername: string) => {
    const now = Date.now();
    if (now - lastReactionRef.current < THROTTLE_MS) return;
    lastReactionRef.current = now;

    // Pin the reaction locally
    const reaction = REACTIONS.find(r => r.id === reactionId);
    if (reaction && currentUsername) {
      const id = `local-${++pinnedIdCounter.current}`;
      setPinnedReactions(prev => [...prev, {
        id,
        reactionId,
        emoji: reaction.emoji,
        senderUsername: currentUsername,
        targetUsername,
      }]);
    }

    onReaction?.(reactionId, targetUsername);
    setOpenPicker(null);
  }, [onReaction, currentUsername]);

  const handleRemoveReaction = useCallback((id: string) => {
    setPinnedReactions(prev => prev.filter(r => r.id !== id));
  }, []);

  // Group pinned reactions by target username
  const reactionsByPlayer = useMemo(() => {
    const map = new Map<string, PinnedReaction[]>();
    for (const r of pinnedReactions) {
      const existing = map.get(r.targetUsername) || [];
      existing.push(r);
      map.set(r.targetUsername, existing);
    }
    return map;
  }, [pinnedReactions]);

  if (!players.length) return null;

  const top3 = players.slice(0, 3);

  return (
    <motion.div
      className="w-full"
      initial={reducedMotion ? undefined : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Section header */}
      <motion.div
        className="flex items-center justify-center gap-1.5 mb-4"
        initial={reducedMotion ? undefined : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.3 }}
      >
        <Trophy className="w-3.5 h-3.5 text-white/30" />
        <span className="font-black text-[10px] text-white/30 uppercase tracking-wider">
          {t('results.matchResults') || 'Match Results'}
        </span>
      </motion.div>

      <div className="grid grid-cols-3 items-end gap-1 px-1 max-w-xs mx-auto">
        {LAYOUT_ORDER.map((configIdx, layoutIdx) => {
          const config = PODIUM_CONFIG[configIdx];
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
          const playerReactions = reactionsByPlayer.get(player.username) || [];

          const scoreDisplay = isWordHunt
            ? `${player.wordsFoundCount ?? 0} ${t('results.words') || 'Words'}`
            : formatScore(player.score);

          const baseDelay = REVEAL_DELAYS[layoutIdx];

          return (
            <motion.div
              key={player.username}
              className={cn('flex flex-col items-center', config.ptOffset)}
              initial={reducedMotion ? undefined : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: baseDelay, duration: 0.2 }}
            >
              {/* Avatar — bouncy drop-in */}
              <motion.div
                className="relative mb-3"
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
                  <motion.div
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
                    customAvatar={(player.avatar as any)?.customAvatar}
                    size={isFirst ? 'lg' : 'md'}
                    className={cn('w-full h-full rounded-full')}
                  />
                </div>

                {/* Crown for 1st — dramatic spin-in with overshoot */}
                {isFirst ? (
                  <motion.div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-neo-lime drop-shadow-md"
                    initial={reducedMotion ? undefined : { scale: 0, rotate: -360, y: -20 }}
                    animate={{ scale: [0, 1.4, 1], rotate: 0, y: 0 }}
                    transition={{
                      type: 'spring',
                      delay: baseDelay + 0.4,
                      stiffness: 250,
                      damping: 10,
                    }}
                  >
                    <Crown className="w-5 h-5 fill-neo-lime" />
                  </motion.div>
                ) : (
                  <motion.div
                    initial={reducedMotion ? undefined : { scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', delay: baseDelay + 0.25, stiffness: 400, damping: 15 }}
                    className={cn(
                      'absolute -top-1.5 -right-1.5 text-black rounded-full flex items-center justify-center border-2 border-black shadow-sm font-black',
                      config.badgeSize,
                      config.bgClass
                    )}
                  >
                    {config.place}
                  </motion.div>
                )}
              </motion.div>

              {/* Name & Score */}
              <motion.div
                className="text-center mb-1 min-w-0 px-1"
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
                <motion.p
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
                </motion.p>
              </motion.div>

              {/* Pinned reactions row + react button */}
              <div className="relative flex items-center justify-center gap-1 mb-2 min-h-[24px] flex-wrap">
                {/* Pinned emoji reactions */}
                <AnimatePresence mode="popLayout">
                  {playerReactions.slice(0, 4).map((pr) => (
                    <PinnedReactionBubble
                      key={pr.id}
                      reaction={pr}
                      onRemove={handleRemoveReaction}
                      canRemove={pr.senderUsername === currentUsername}
                    />
                  ))}
                </AnimatePresence>

                {/* React button — icon-based, clearly a button */}
                {showEmojiButton && (
                  <div className="relative">
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => setOpenPicker(openPicker === player.username ? null : player.username)}
                      className={cn(
                        'w-7 h-7 flex items-center justify-center rounded-full border-2 transition-all',
                        'bg-neo-white/10 border-neo-white/20 hover:bg-neo-white/20 hover:border-neo-white/40',
                        openPicker === player.username && 'bg-neo-cyan/20 border-neo-cyan/50'
                      )}
                      aria-label={`Send reaction to ${player.username}`}
                    >
                      <SmilePlus className="w-3.5 h-3.5 text-white/60" />
                    </motion.button>
                    <AnimatePresence>
                      {openPicker === player.username && (
                        <PodiumEmojiPicker
                          onSelect={(id) => handleEmojiSelect(id, player.username)}
                          onClose={() => setOpenPicker(null)}
                          align={config.pickerAlign}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Podium bar — elastic grow from bottom with slight overshoot */}
              <motion.div
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
                <motion.span
                  initial={reducedMotion ? undefined : { opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15, delay: baseDelay + 0.45 }}
                >
                  {config.place}
                </motion.span>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
