'use client';

/**
 * RankHighlight — Rank-focused badge shown after PlacementHero.
 * Inspired by Daily Word Hunt's RankBadge but adapted for multiplayer:
 * golden shimmer for winners, encouraging messages for others.
 */

import { m } from 'framer-motion';
import { Crown, TrendingUp, Swords } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import useReducedMotion from '@/hooks/useReducedMotion';

interface RankHighlightProps {
  rank: number;
  totalPlayers: number;
  gapToWinner: number;
  winnerUsername?: string;
}

const RANK_CONFIGS: Record<number, {
  bg: string;
  border: string;
  text: string;
  icon: typeof Crown;
  glowColor: string;
  messageKey: string;
}> = {
  1: {
    bg: 'bg-linear-to-r from-amber-400 via-yellow-300 to-amber-400',
    border: 'border-neo-black',
    text: 'text-neo-black',
    icon: Crown,
    glowColor: 'rgba(255,225,53,0.4)',
    messageKey: 'results.rankHighlight.champion',
  },
  2: {
    bg: 'bg-linear-to-r from-slate-300 via-slate-200 to-slate-300',
    border: 'border-neo-black',
    text: 'text-neo-black',
    icon: TrendingUp,
    glowColor: 'rgba(148,163,184,0.3)',
    messageKey: 'results.rankHighlight.soClose',
  },
  3: {
    bg: 'bg-linear-to-r from-orange-400 via-amber-300 to-orange-400',
    border: 'border-neo-black',
    text: 'text-neo-black',
    icon: TrendingUp,
    glowColor: 'rgba(255,107,53,0.3)',
    messageKey: 'results.rankHighlight.podium',
  },
};

export function RankHighlight({ rank, totalPlayers, gapToWinner, winnerUsername }: RankHighlightProps) {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();

  // Only show for games with 2+ players
  if (totalPlayers < 2) return null;

  const config = RANK_CONFIGS[rank] || {
    bg: 'bg-neo-navy-light',
    border: 'border-neo-black/40',
    text: 'text-neo-white',
    icon: Swords,
    glowColor: 'rgba(255,20,147,0.2)',
    messageKey: 'results.rankHighlight.keepGoing',
  };

  const Icon = config.icon;

  return (
    <m.div
      initial={reducedMotion ? undefined : { scale: 0, rotate: -15, y: 20 }}
      animate={{ scale: 1, rotate: 0, y: 0 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 350, damping: 15 }}
      className="flex flex-col items-center gap-2"
    >
      {/* Main rank badge */}
      <m.div
        animate={!reducedMotion && rank <= 3 ? { rotate: [0, -3, 3, -2, 2, 0] } : undefined}
        transition={{ delay: 1.2, duration: 0.5, ease: 'easeInOut' }}
        className={`relative inline-flex items-center gap-2.5 px-6 py-3 ${config.bg} border-3 ${config.border} shadow-hard-lg overflow-hidden`}
        style={rank <= 3 ? { boxShadow: `0 0 20px ${config.glowColor}, 4px 4px 0px black` } : undefined}
      >
        {/* Halftone texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[radial-gradient(circle,#000_1px,transparent_1px)] bg-size-[6px_6px]" />
        {/* Shimmer sweep for podium finishers */}
        {!reducedMotion && rank <= 3 && (
          <m.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.5) 50%, transparent 60%)',
            }}
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{ delay: 1.4, duration: 0.8, ease: 'easeInOut' }}
          />
        )}
        <m.div
          animate={!reducedMotion ? { rotate: [0, 12, -12, 0] } : undefined}
          transition={{ delay: 1.3, duration: 0.4 }}
        >
          <Icon className={`w-5 h-5 ${config.text}`} />
        </m.div>
        <span className={`font-black text-lg ${config.text} uppercase tracking-wider`}>
          {t(config.messageKey)}
        </span>
      </m.div>

      {/* Gap to winner — motivational nudge for non-winners */}
      {rank > 1 && gapToWinner > 0 && (
        <m.div
          initial={reducedMotion ? undefined : { opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-xs font-bold text-neo-pink uppercase tracking-wider"
        >
          {t('results.pointsBehind', { points: gapToWinner })}
          {winnerUsername && ` — ${winnerUsername}`}
        </m.div>
      )}
    </m.div>
  );
}

export default RankHighlight;
