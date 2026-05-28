'use client';

import React, { memo, useState, useEffect } from 'react';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { RankBadge } from '@/components/ui/RankBadge';
import PlayerProfileTooltip from '@/components/ui/PlayerProfileTooltip';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScoreCountUp } from '@/components/results/shared';

interface Participant {
  name: string;
  score: number;
  isCurrentPlayer?: boolean;
  isBot?: boolean;
}

interface EmojiReaction {
  id: string;
  emoji: string;
  username: string;
  timestamp: number;
}

interface MobileCompactLeaderboardProps {
  /** Sorted participants (highest score first) */
  participants: Participant[];
  /** Additional className */
  className?: string;
  /** Emoji reactions to display as speech bubbles near player rows */
  emojiReactions?: EmojiReaction[];
}

const BUBBLE_DURATION = 2500;

/** Speech bubble that appears near a player's row when they receive an emoji reaction */
function EmojiBubble({ emoji, onDone }: { emoji: string; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, BUBBLE_DURATION);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <m.div
      initial={{ scale: 0, y: 10, opacity: 0 }}
      animate={{ scale: 1, y: -8, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
      className="absolute -top-2 inset-e-10 z-20 bg-neo-cream border-3 border-neo-black rounded-neo shadow-hard-sm px-2 py-1 text-lg pointer-events-none"
    >
      {emoji}
      {/* Triangle pointer */}
      <div className="absolute -bottom-1.5 inset-e-3 w-3 h-3 bg-neo-cream border-b-3 border-s-3 border-neo-black rotate-45" />
    </m.div>
  );
}

/**
 * MobileCompactLeaderboard — Full ranked leaderboard for mobile
 *
 * Shows ALL players with staggered entrance animations, winner glow,
 * score count-up, and emoji speech bubbles.
 */
const MobileCompactLeaderboard: React.FC<MobileCompactLeaderboardProps> = memo(({
  participants,
  className,
  emojiReactions = [],
}) => {
  const { t, dir } = useLanguage();
  const reducedMotion = useReducedMotion();
  const [dismissedBubbles, setDismissedBubbles] = useState<Set<string>>(new Set());

  if (participants.length === 0) return null;

  const xDirection = dir === 'rtl' ? 20 : -20;

  const activeBubbles = emojiReactions.filter(r => !dismissedBubbles.has(r.id));

  return (
    <div className={cn(
      'bg-white/5 rounded-neo border border-white/10 overflow-hidden',
      className
    )}>
      {participants.map((participant, index) => {
        const isWinner = index === 0;
        const rowBubbles = activeBubbles.filter(r => r.username === participant.name);

        return (
          <m.div
            key={participant.name}
            initial={reducedMotion ? undefined : { opacity: 0, x: xDirection }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 24,
              delay: reducedMotion ? 0 : 0.06 * index,
            }}
            className={cn(
              'relative flex items-center justify-between px-3 py-2',
              index < participants.length - 1 && 'border-b border-white/10',
              participant.isCurrentPlayer && 'bg-neo-cyan/10',
              isWinner && 'border-s-4 border-s-neo-lime',
            )}
          >
            {/* Winner pulsing border glow */}
            {isWinner && !reducedMotion && (
              <m.div
                className="absolute inset-y-0 inset-s-0 w-1 bg-neo-lime"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}

            {/* Emoji speech bubbles */}
            <AnimatePresence>
              {rowBubbles.map(r => (
                <EmojiBubble
                  key={r.id}
                  emoji={r.emoji}
                  onDone={() => setDismissedBubbles(prev => new Set(prev).add(r.id))}
                />
              ))}
            </AnimatePresence>

            <div className="flex items-center gap-2 min-w-0">
              <m.div
                initial={reducedMotion ? undefined : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 15, delay: reducedMotion ? 0 : 0.06 * index + 0.12 }}
              >
                <RankBadge rank={index + 1} />
              </m.div>
              <PlayerProfileTooltip
                player={{
                  username: participant.name,
                  score: participant.score,
                }}
                isCurrentUser={participant.isCurrentPlayer}
                side="right"
              >
                <span className={cn(
                  'font-bold text-sm truncate',
                  participant.isCurrentPlayer ? 'text-neo-cyan' : 'text-white cursor-pointer hover:underline'
                )}>
                  {participant.name}
                </span>
              </PlayerProfileTooltip>
              {participant.isCurrentPlayer && (
                <span className="text-neo-cyan text-[10px] font-black uppercase bg-neo-cyan/20 px-1.5 py-0.5 rounded">{t('results.you')}</span>
              )}
            </div>
            <span className={cn(
              'font-black text-sm tabular-nums flex items-center gap-1',
              participant.isCurrentPlayer ? 'text-neo-cyan' : 'text-white'
            )}>
              {isWinner && <span className="text-xs">🔥</span>}
              <ScoreCountUp
                to={participant.score}
                duration={1200}
                delay={reducedMotion ? 0 : 60 * index + 200}
              />
            </span>
          </m.div>
        );
      })}
    </div>
  );
});

MobileCompactLeaderboard.displayName = 'MobileCompactLeaderboard';

export default MobileCompactLeaderboard;
