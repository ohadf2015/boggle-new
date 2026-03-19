'use client';

import React, { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ShieldCheck, Skull, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import Avatar from '../Avatar';
import PlayerProfileTooltip from '@/components/ui/PlayerProfileTooltip';
import { ScoreCountUp } from '@/components/results/shared';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

// ============================================================
// TYPES
// ============================================================

export interface FightCardParticipant {
  name: string;
  score: number;
  isCurrentPlayer?: boolean;
  isBot?: boolean;
  avatar?: {
    emoji?: string;
    color?: string;
    profilePictureUrl?: string | null;
    avatarImage?: string;
    customAvatar?: CustomAvatarConfig | null;
  };
  survived?: boolean;
  lifeRemaining?: number;
}

interface EmojiReaction {
  id: string;
  emoji: string;
  username: string;
  timestamp: number;
}

interface FightCardLeaderboardProps {
  participants: FightCardParticipant[];
  currentUsername?: string;
  gameMode?: string;
  emojiReactions?: EmojiReaction[];
  className?: string;
}

// ============================================================
// EMOJI BUBBLE
// ============================================================

function EmojiBubble({ emoji, onDone }: { emoji: string; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <motion.div
      initial={{ scale: 0, y: 10, opacity: 0 }}
      animate={{ scale: 1, y: -8, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
      className="absolute -top-2 end-10 z-20 bg-neo-cream border-3 border-neo-black rounded-neo shadow-hard-sm px-2 py-1 text-lg pointer-events-none"
    >
      {emoji}
      <div className="absolute -bottom-1.5 end-3 w-3 h-3 bg-neo-cream border-b-3 border-s-3 border-neo-black rotate-45" />
    </motion.div>
  );
}

// ============================================================
// RANK ACCENT CONFIG
// ============================================================

const RANK_ACCENTS: Record<number, { borderColor: string; textColor: string; rankBoxBorder: string }> = {
  1: { borderColor: 'border-s-neo-lime', textColor: 'text-neo-lime', rankBoxBorder: 'border-neo-lime' },
  2: { borderColor: 'border-s-neo-cyan', textColor: 'text-neo-cyan', rankBoxBorder: 'border-neo-cyan' },
  3: { borderColor: 'border-s-neo-orange', textColor: 'text-neo-orange', rankBoxBorder: 'border-neo-orange' },
};

const DEFAULT_ACCENT = { borderColor: 'border-s-slate-700', textColor: 'text-slate-400', rankBoxBorder: 'border-slate-700' };

// ============================================================
// PLAYER ROW — Fight Card Style (responsive)
// ============================================================

interface PlayerRowProps {
  participant: FightCardParticipant;
  rank: number;
  isCurrentPlayer: boolean;
  reducedMotion: boolean | null;
  index: number;
  showProgressBar?: boolean;
  eliminated?: boolean;
  emojiReactions: EmojiReaction[];
  onDismissBubble: (id: string) => void;
  t: (key: string) => string;
}

const PlayerRow: React.FC<PlayerRowProps> = ({
  participant, rank, isCurrentPlayer, reducedMotion, index,
  showProgressBar, eliminated, emojiReactions, onDismissBubble, t,
}) => {
  const accent = RANK_ACCENTS[rank] ?? DEFAULT_ACCENT;

  // Fight card scaling: rank 1 larger, dramatic falloff for lower ranks
  const scaleDown = rank === 1 ? 1.02 : rank === 2 ? 0.98 : rank === 3 ? 0.95 : 0.9;
  const opacityDown = rank === 1 ? 1 : rank === 2 ? 0.9 : rank === 3 ? 0.75 : 0.55;

  const rowBubbles = emojiReactions.filter(r => r.username === participant.name);

  return (
    <motion.div
      initial={reducedMotion ? undefined : { opacity: 0, y: 24, x: rank === 1 ? -10 : 0, scale: 0.92 }}
      animate={{ opacity: opacityDown, y: 0, x: 0, scale: eliminated ? 0.93 : scaleDown }}
      transition={{
        type: 'spring',
        stiffness: 280,
        damping: 20,
        delay: reducedMotion ? 0 : 0.12 * index,
      }}
      className={cn(
        'relative flex items-center gap-2 sm:gap-3 border-3 border-neo-black',
        // Rank 1: larger padding + thicker left accent
        rank === 1 ? 'p-3 sm:p-4 shadow-hard-xl border-s-[8px] sm:border-s-[10px]' : 'p-2.5 sm:p-3 shadow-hard border-s-[5px] sm:border-s-[6px]',
        accent.borderColor,
        isCurrentPlayer && !eliminated ? 'bg-neo-cyan/10' : rank === 1 ? 'bg-slate-800/70' : 'bg-slate-800/20',
        eliminated && 'filter grayscale',
      )}
      style={eliminated ? { opacity: 0.5 } : undefined}
    >
      {/* Current player: pulsing cyan border glow */}
      {isCurrentPlayer && !eliminated && !reducedMotion && (
        <motion.div
          className="absolute inset-0 pointer-events-none border-2 border-neo-cyan rounded-[1px]"
          animate={{
            borderColor: ['var(--neo-cyan)', '#fff', 'var(--neo-cyan)'],
            boxShadow: ['0 0 0px var(--neo-cyan)', '0 0 10px var(--neo-cyan)', '0 0 0px var(--neo-cyan)'],
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Winner: trophy watermark */}
      {rank === 1 && !eliminated && (
        <div className="absolute top-0 end-0 p-1.5 sm:p-2 opacity-10 pointer-events-none">
          <Trophy className="w-8 h-8 sm:w-12 sm:h-12 text-white" />
        </div>
      )}

      {/* Emoji speech bubbles */}
      <AnimatePresence>
        {rowBubbles.map(r => (
          <EmojiBubble key={r.id} emoji={r.emoji} onDone={() => onDismissBubble(r.id)} />
        ))}
      </AnimatePresence>

      {/* Rank box — responsive sizing */}
      <div className={cn(
        'shrink-0 flex items-center justify-center border-3 bg-neo-black font-neo-display',
        rank === 1 ? 'w-8 h-8 sm:w-10 sm:h-10 text-lg sm:text-xl' : 'w-7 h-7 sm:w-8 sm:h-8 text-base sm:text-lg',
        accent.rankBoxBorder,
      )}>
        <span className={accent.textColor}>{rank}</span>
      </div>

      {/* Avatar — responsive sizing */}
      <div className={cn(
        'rounded-full border-2 sm:border-3 border-neo-black bg-slate-700 overflow-hidden shrink-0',
        rank === 1 ? 'w-10 h-10 sm:w-12 sm:h-12' : 'w-8 h-8 sm:w-10 sm:h-10',
      )}>
        <PlayerProfileTooltip
          player={{
            username: participant.name,
            profilePictureUrl: participant.avatar?.profilePictureUrl,
            avatarImage: participant.avatar?.avatarImage,
            customAvatar: participant.avatar?.customAvatar,
            score: participant.score,
          }}
          isCurrentUser={isCurrentPlayer}
          side="right"
        >
          <Avatar
            profilePictureUrl={participant.avatar?.profilePictureUrl ?? undefined}
            avatarImage={participant.avatar?.avatarImage}
            customAvatar={participant.avatar?.customAvatar}
            size={rank === 1 ? 'md' : 'sm'}
          />
        </PlayerProfileTooltip>
      </div>

      {/* Name + subtitle + optional progress bar */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'font-neo-display uppercase leading-none truncate',
          rank === 1 ? 'text-base sm:text-xl text-white' : 'text-sm sm:text-lg',
          isCurrentPlayer ? 'text-white' : eliminated ? 'text-white/60' : 'text-white',
        )}>
          {isCurrentPlayer ? t('results.you').replace(/[()]/g, '') : participant.name}
        </p>
        {isCurrentPlayer && !eliminated && (
          <p className={cn('text-[7px] sm:text-[8px] font-black uppercase tracking-wider', accent.textColor)}>
            {rank === 1 ? t('results.ultimateChampion') : t('results.risingContender')}
          </p>
        )}
        {rank === 1 && !isCurrentPlayer && !eliminated && (
          <p className="text-[7px] sm:text-[8px] font-black uppercase tracking-wider text-neo-lime">
            {t('results.ultimateChampion')}
          </p>
        )}
        {/* Word Hunt: progress bar with animated fill */}
        {showProgressBar && participant.lifeRemaining !== undefined && (
          <div className="w-full h-1 sm:h-1.5 bg-neo-black mt-1 border-[1px] border-slate-700">
            <motion.div
              className={cn('h-full', isCurrentPlayer ? 'bg-neo-cyan' : 'bg-neo-lime')}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(0, Math.min(100, participant.lifeRemaining * 100))}%` }}
              transition={{ delay: 0.3 + index * 0.1, duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        )}
      </div>

      {/* Score — responsive text */}
      <div className="text-end shrink-0">
        <span className={cn(
          'font-neo-display tabular-nums',
          rank === 1 ? 'text-xl sm:text-2xl' : 'text-base sm:text-xl',
          rank === 1 ? accent.textColor : isCurrentPlayer ? 'text-white' : 'text-white/40',
        )}>
          <ScoreCountUp to={participant.score} duration={1200} delay={reducedMotion ? 0 : 80 * index + 200} />
        </span>
      </div>
    </motion.div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

const FightCardLeaderboard: React.FC<FightCardLeaderboardProps> = memo(({
  participants, currentUsername, gameMode, emojiReactions = [], className,
}) => {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();
  const [dismissedBubbles, setDismissedBubbles] = useState<Set<string>>(new Set());

  const activeBubbles = emojiReactions.filter(r => !dismissedBubbles.has(r.id));
  const handleDismiss = (id: string) => setDismissedBubbles(prev => new Set(prev).add(id));

  if (participants.length === 0) return null;

  const isWordHunt = gameMode === 'word-hunt';

  // Word Hunt: split into survivors and eliminated
  if (isWordHunt) {
    const survivors = participants.filter(p => p.survived !== false);
    const eliminated = participants.filter(p => p.survived === false);

    return (
      <div className={cn('space-y-4 sm:space-y-5', className)}>
        {survivors.length > 0 && (
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-2 px-1">
              <ShieldCheck className="w-4 h-4 text-neo-lime" />
              <h2 className="font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] text-neo-lime">
                {t('results.survivors')}
              </h2>
            </div>
            {survivors.map((p, i) => {
              const globalRank = participants.indexOf(p) + 1;
              return (
                <PlayerRow
                  key={p.name} participant={p} rank={globalRank}
                  isCurrentPlayer={p.isCurrentPlayer ?? p.name === currentUsername}
                  reducedMotion={reducedMotion} index={i} showProgressBar
                  emojiReactions={activeBubbles} onDismissBubble={handleDismiss} t={t}
                />
              );
            })}
          </div>
        )}
        {eliminated.length > 0 && (
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-2 px-1">
              <Skull className="w-4 h-4 text-neo-red" />
              <h2 className="font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] text-neo-red">
                {t('results.eliminated')}
              </h2>
            </div>
            {eliminated.map((p, i) => {
              const globalRank = participants.indexOf(p) + 1;
              return (
                <PlayerRow
                  key={p.name} participant={p} rank={globalRank}
                  isCurrentPlayer={p.isCurrentPlayer ?? p.name === currentUsername}
                  reducedMotion={reducedMotion} index={survivors.length + i} eliminated
                  emojiReactions={activeBubbles} onDismissBubble={handleDismiss} t={t}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Classic / Blast: single ranked list
  return (
    <div className={cn('space-y-1.5 sm:space-y-2', className)}>
      <div className="flex items-center justify-between px-1 mb-1.5 sm:mb-2">
        <h2 className="font-black text-[10px] sm:text-xs uppercase tracking-widest text-neo-cream/60">
          {t('results.battleRankings')}
        </h2>
        <span className="text-[9px] sm:text-[10px] font-bold bg-neo-black px-1.5 sm:px-2 py-0.5 border-2 sm:border-3 border-slate-700 uppercase text-white/60">
          {participants.length} {t('results.players')}
        </span>
      </div>
      {participants.map((p, i) => (
        <PlayerRow
          key={p.name} participant={p} rank={i + 1}
          isCurrentPlayer={p.isCurrentPlayer ?? p.name === currentUsername}
          reducedMotion={reducedMotion} index={i}
          emojiReactions={activeBubbles} onDismissBubble={handleDismiss} t={t}
        />
      ))}
    </div>
  );
});

FightCardLeaderboard.displayName = 'FightCardLeaderboard';

export default FightCardLeaderboard;
