'use client';

import { memo } from 'react';
import { Heart, Swords, Clock, Zap, MessageCircleWarning, Target } from 'lucide-react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';


export type DeathCause = 'lifeDrain' | 'wrongGuess';

export interface DeathRecapStats {
  /** What actually killed them */
  cause: DeathCause;
  /** How many valid words they found */
  wordsFound: number;
  /** How many wrong target guesses they made */
  wrongGuesses: number;
  /** Seconds they survived */
  survivalSeconds: number;
  /** Total players in the match */
  totalPlayers: number;
  /** Their elimination order (1 = first out) */
  eliminationOrder: number;
  /** Average word length */
  avgWordLength: number;
}

export interface WordHuntDeathRecapProps {
  stats: DeathRecapStats;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * Determine the primary lesson to teach based on what actually went wrong.
 * Returns a translation key for the personalized lesson.
 */
function getDeathLesson(stats: DeathRecapStats): { key: string; params?: Record<string, string | number> } {
  const { cause, wordsFound, wrongGuesses, avgWordLength } = stats;

  // Wrong guess killed them — teach about the penalty
  if (cause === 'wrongGuess') {
    return {
      key: 'wordHuntDeathRecap.lessonWrongGuess',
      params: { penalty: 15, guesses: wrongGuesses },
    };
  }

  // Barely any words — they didn't know swiping heals
  if (wordsFound < 3) {
    return {
      key: 'wordHuntDeathRecap.lessonNoWords',
      params: { count: wordsFound },
    };
  }

  // Some words but only short ones — teach about bigger heals
  if (avgWordLength > 0 && avgWordLength < 4) {
    return {
      key: 'wordHuntDeathRecap.lessonShortWords',
      params: { avg: Math.round(avgWordLength * 10) / 10 },
    };
  }

  // Too many wrong guesses draining life alongside drain
  if (wrongGuesses >= 3) {
    return {
      key: 'wordHuntDeathRecap.lessonTooManyGuesses',
      params: { guesses: wrongGuesses, cost: wrongGuesses * 15 },
    };
  }

  // Default: general survival tip about word pacing
  return {
    key: 'wordHuntDeathRecap.lessonPacing',
  };
}

/** Format seconds as MM:SS or Xs */
function formatTime(seconds: number): string {
  if (seconds >= 60) {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }
  return `${seconds}s`;
}

/**
 * Death Recap card — shows after elimination impact animation.
 * Visual "autopsy" explaining why the player died with personalized lesson.
 */
const WordHuntDeathRecap = memo<WordHuntDeathRecapProps>(({ stats, t }) => {
  const lesson = getDeathLesson(stats);
  const causeIcon = stats.cause === 'wrongGuess' ? Target : Heart;
  const CauseIcon = causeIcon;

  return (
    <AdaptiveMotion.div
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="w-full max-w-xs mx-auto"
      data-testid="death-recap"
    >
      {/* Card */}
      <div className="bg-neo-navy/95 border-3 border-neo-red/60 rounded-neo shadow-hard-lg overflow-hidden">
        {/* Header strip */}
        <div className="bg-neo-red/20 border-b-2 border-neo-red/30 px-4 py-2 flex items-center gap-2">
          <CauseIcon size={16} className="text-neo-red" />
          <span className="text-xs font-neo-display font-bold text-neo-red uppercase tracking-wider">
            {stats.cause === 'wrongGuess'
              ? t('wordHuntDeathRecap.causeWrongGuess')
              : t('wordHuntDeathRecap.causeLifeDrain')
            }
          </span>
        </div>

        {/* Stats row */}
        <div className="flex divide-x divide-white/10 px-1 py-3">
          <StatPill
            icon={<Swords size={14} className="text-neo-cyan" />}
            value={String(stats.wordsFound)}
            label={t('wordHuntDeathRecap.statWords')}
          />
          <StatPill
            icon={<MessageCircleWarning size={14} className="text-neo-red" />}
            value={String(stats.wrongGuesses)}
            label={t('wordHuntDeathRecap.statWrongGuesses')}
          />
          <StatPill
            icon={<Clock size={14} className="text-neo-lime" />}
            value={formatTime(stats.survivalSeconds)}
            label={t('wordHuntDeathRecap.statSurvival')}
          />
        </div>

        {/* Lesson card */}
        <div className="mx-3 mb-3 p-3 rounded-neo bg-neo-cyan/10 border-2 border-neo-cyan/30">
          <div className="flex items-start gap-2">
            <Zap size={14} className="text-neo-cyan shrink-0 mt-0.5" />
            <p className="text-xs font-neo-body text-neo-white leading-relaxed font-medium">
              {t(lesson.key, lesson.params)}
            </p>
          </div>
        </div>

        {/* Elimination order */}
        <div className="px-4 pb-3 text-center">
          <span className="text-[10px] font-bold text-white uppercase tracking-widest">
            {t('wordHuntDeathRecap.eliminatedOrder', {
              order: stats.eliminationOrder,
              total: stats.totalPlayers,
            })}
          </span>
        </div>
      </div>
    </AdaptiveMotion.div>
  );
});

WordHuntDeathRecap.displayName = 'WordHuntDeathRecap';
export { WordHuntDeathRecap, getDeathLesson };

/** Small stat pill for the 3-across row */
function StatPill({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1 px-2">
      {icon}
      <span className="text-sm font-mono font-black text-neo-white tabular-nums">
        {value}
      </span>
      <span className="text-[8px] font-bold text-white uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}
