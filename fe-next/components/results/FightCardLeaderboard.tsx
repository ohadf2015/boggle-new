'use client';

import React, { memo, useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { ShieldCheck, Skull, Trophy, Crown, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import Avatar from '../Avatar';
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
  /** Show only top 2 + current player initially, expand for rest */
  deferRankings?: boolean;
}

// ============================================================
// RANK ACCENTS — minimal color per rank
// ============================================================

interface RankAccent {
  borderColor: string;
  textColor: string;
  rankBg: string;
  rankText: string;
}

const RANK_ACCENTS: Record<number, RankAccent> = {
  1: { borderColor: 'border-neo-lime/40', textColor: 'text-neo-lime', rankBg: 'bg-neo-lime', rankText: 'text-neo-black' },
  2: { borderColor: 'border-neo-cyan/30', textColor: 'text-neo-cyan', rankBg: 'bg-neo-cyan', rankText: 'text-neo-black' },
  3: { borderColor: 'border-neo-orange/30', textColor: 'text-neo-orange', rankBg: 'bg-neo-orange', rankText: 'text-neo-black' },
};

const DEFAULT_ACCENT: RankAccent = {
  borderColor: 'border-slate-700/30', textColor: 'text-slate-400', rankBg: 'bg-neo-navy-elevated', rankText: 'text-slate-300',
};

// ============================================================
// PLAYER ROW — Clean, minimal
// ============================================================

interface PlayerRowProps {
  participant: FightCardParticipant;
  rank: number;
  isCurrentPlayer: boolean;
  reducedMotion: boolean | null;
  index: number;
  showProgressBar?: boolean;
  eliminated?: boolean;
  t: (key: string) => string;
}

const PlayerRow: React.FC<PlayerRowProps> = ({
  participant, rank, isCurrentPlayer, reducedMotion, index,
  showProgressBar, eliminated, t,
}) => {
  const accent = RANK_ACCENTS[rank] ?? DEFAULT_ACCENT;

  return (
    <m.div
      initial={reducedMotion ? undefined : { opacity: 0, y: 12 }}
      animate={{ opacity: eliminated ? 0.4 : 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22, delay: reducedMotion ? 0 : 0.06 * index }}
      className={cn(
        'flex items-center gap-2.5 rounded-neo border-2 p-2.5 sm:p-3',
        accent.borderColor,
        isCurrentPlayer && !eliminated && 'bg-neo-white/4 border-neo-cyan/40',
        eliminated && 'opacity-40',
      )}
    >
      {/* Rank */}
      <div className={cn(
        'shrink-0 flex items-center justify-center rounded-neo font-black w-7 h-7 text-xs',
        accent.rankBg, accent.rankText,
      )}>
        {rank === 1 ? <Crown className="w-4 h-4" /> : rank}
      </div>

      {/* Avatar */}
      <div className={cn(
        'rounded-full border-2 overflow-hidden shrink-0 w-9 h-9',
        rank === 1 ? 'border-neo-lime/40 bg-neo-cream' : 'border-slate-700 bg-neo-navy-light',
      )}>
        <Avatar
          customAvatar={participant.avatar?.customAvatar}
          userId={participant.name}
          size="md"
        />
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'font-neo-display uppercase leading-none truncate text-xs sm:text-sm',
          isCurrentPlayer ? 'text-white' : eliminated ? 'text-white' : 'text-neo-white',
        )}>
          {isCurrentPlayer ? t('results.you').replace(/[()]/g, '') : participant.name}
        </p>
        {/* Word Hunt: life bar */}
        {showProgressBar && participant.lifeRemaining !== undefined && (
          <div className="w-full h-1 bg-neo-navy-light mt-1 rounded-full overflow-hidden">
            <m.div
              className={cn('h-full rounded-full', isCurrentPlayer ? 'bg-neo-cyan' : 'bg-neo-lime')}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(0, Math.min(100, participant.lifeRemaining * 100))}%` }}
              transition={{ delay: 0.3 + index * 0.1, duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        )}
      </div>

      {/* Score */}
      <span className={cn(
        'shrink-0 font-neo-display font-black tabular-nums text-sm sm:text-base',
        rank === 1 ? accent.textColor : isCurrentPlayer ? 'text-white' : 'text-neo-white',
      )}>
        {(rank === 1 || isCurrentPlayer) ? (
          <ScoreCountUp to={participant.score} duration={1000} delay={reducedMotion ? 0 : 60 * index + 200} />
        ) : (
          participant.score.toLocaleString()
        )}
      </span>
    </m.div>
  );
};

// ============================================================
// SECTION HEADER
// ============================================================

function SectionHeader({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 px-1 mb-1.5">
      {icon}
      <h2 className={cn('font-black text-[10px] uppercase tracking-[0.15em]', color)}>{label}</h2>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

const FightCardLeaderboard: React.FC<FightCardLeaderboardProps> = memo(({
  participants, currentUsername, gameMode, className, deferRankings = false,
}) => {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(false);

  if (participants.length === 0) return null;

  const isWordHunt = gameMode === 'word-hunt';

  // Word Hunt: split into survivors and eliminated
  if (isWordHunt) {
    const survivors = participants.filter(p => p.survived !== false);
    const eliminated = participants.filter(p => p.survived === false);

    return (
      <div className={cn('border-3 border-neo-black rounded-neo bg-neo-navy/50 shadow-hard overflow-hidden', className)}>
        {survivors.length > 0 && (
          <div className="p-2.5 sm:p-3 space-y-1.5">
            <SectionHeader icon={<ShieldCheck className="w-3.5 h-3.5 text-neo-lime" />} label={t('results.survivors')} color="text-neo-lime" />
            {survivors.map((p, i) => {
              const globalRank = participants.indexOf(p) + 1;
              return (
                <PlayerRow
                  key={p.name} participant={p} rank={globalRank}
                  isCurrentPlayer={p.isCurrentPlayer ?? p.name === currentUsername}
                  reducedMotion={reducedMotion} index={i} showProgressBar t={t}
                />
              );
            })}
          </div>
        )}
        {eliminated.length > 0 && (
          <div className={cn('p-2.5 sm:p-3 space-y-1.5', survivors.length > 0 && 'border-t-2 border-slate-700/30')}>
            <SectionHeader icon={<Skull className="w-3.5 h-3.5 text-neo-red" />} label={t('results.eliminated')} color="text-neo-red" />
            {eliminated.map((p, i) => {
              const globalRank = participants.indexOf(p) + 1;
              return (
                <PlayerRow
                  key={p.name} participant={p} rank={globalRank}
                  isCurrentPlayer={p.isCurrentPlayer ?? p.name === currentUsername}
                  reducedMotion={reducedMotion} index={survivors.length + i} eliminated t={t}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Deferred rankings: show top 2 + current player (always visible), collapse the rest
  const shouldDefer = deferRankings && participants.length > 3 && !expanded;
  const visibleParticipants = shouldDefer
    ? participants.filter((p, i) => i < 2 || p.isCurrentPlayer || p.name === currentUsername)
    : participants;
  const hiddenCount = participants.length - visibleParticipants.length;

  return (
    <div className={cn('border-3 border-neo-black rounded-neo bg-neo-navy/50 shadow-hard overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b-2 border-slate-700/30">
        <div className="flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-neo-white" />
          <h2 className="font-black text-[10px] uppercase tracking-[0.15em] text-neo-white">
            {t('results.battleRankings')}
          </h2>
        </div>
        <span className="text-[9px] font-bold text-neo-white">
          {participants.length} {t('results.players')}
        </span>
      </div>

      {/* Rows */}
      <div className="p-2 sm:p-2.5 space-y-1.5">
        {visibleParticipants.map((p) => {
          const originalIndex = participants.indexOf(p);
          return (
            <PlayerRow
              key={p.name} participant={p} rank={originalIndex + 1}
              isCurrentPlayer={p.isCurrentPlayer ?? p.name === currentUsername}
              reducedMotion={reducedMotion} index={originalIndex} t={t}
            />
          );
        })}
        {shouldDefer && hiddenCount > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="w-full py-2 rounded-neo border-2 border-dashed border-slate-700/40 text-[10px] font-black uppercase tracking-wider text-neo-white hover:text-neo-white hover:border-neo-cream/20 transition-colors flex items-center justify-center gap-1"
          >
            <ChevronDown className="w-3 h-3" />
            {t('results.showAllRankings', { count: hiddenCount })}
          </button>
        )}
      </div>
    </div>
  );
});

FightCardLeaderboard.displayName = 'FightCardLeaderboard';

export default FightCardLeaderboard;
