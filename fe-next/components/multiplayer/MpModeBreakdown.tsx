'use client';

import { memo, useMemo } from 'react';
import { m } from 'framer-motion';
import { Sword, Bomb, Search, CircleDot } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { MpRound } from '@/lib/multiplayer/mpRoundAggregation';

const MODE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  classic: Sword,
  blast: Bomb,
  'word-hunt': Search,
  'wheel-rush': CircleDot,
};

const MODE_COLORS: Record<string, { icon: string; border: string }> = {
  classic: { icon: 'text-neo-cyan', border: 'border-neo-cyan/50' },
  blast: { icon: 'text-neo-pink', border: 'border-neo-pink/50' },
  'word-hunt': { icon: 'text-neo-purple', border: 'border-neo-purple/50' },
  'wheel-rush': { icon: 'text-neo-lime', border: 'border-neo-lime/50' },
};

interface MpModeBreakdownProps {
  rounds: MpRound[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const rowVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

const MpModeBreakdown = memo<MpModeBreakdownProps>(({ rounds }) => {
  const { t, dir } = useLanguage();

  const roundsWithInfo = useMemo(() => {
    return rounds.map((round) => {
      const Icon = MODE_ICONS[round.gameMode] || Sword;
      const colors = MODE_COLORS[round.gameMode] || MODE_COLORS.classic;
      return {
        ...round,
        Icon,
        colors,
      };
    });
  }, [rounds]);

  if (rounds.length === 0) {
    return (
      <div className="text-center py-6 text-neo-white/60 text-sm">
        {t('mpModeBreakdown.emptyState')}
      </div>
    );
  }

  return (
    <div dir={dir} className="space-y-3">
      <h3 className="text-sm font-black uppercase tracking-wider text-neo-white px-2">
        {t('mpModeBreakdown.title')}
      </h3>

      <m.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-2"
      >
        {roundsWithInfo.map((round) => {
          const { Icon, colors } = round;
          // Seeded with 0: a round with no scores would otherwise throw
          // "Reduce of empty array with no initial value" and take the whole
          // results screen down (same shape as Sentry JAVASCRIPT-NEXTJS-206).
          const topScore = round.scores.reduce((max, s) => (s.score > max ? s.score : max), 0);

          return (
            <m.div key={round.roundIndex} variants={rowVariants}>
              <div className={`relative overflow-hidden rounded-neo border-2 ${colors.border} p-3 bg-linear-to-r from-neo-navy via-neo-navy-light to-neo-navy shadow-hard-sm`}>
                <div className="flex items-start justify-between gap-3">
                  {/* Mode icon + label */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Icon className={`w-5 h-5 flex-shrink-0 ${colors.icon}`} />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neo-white truncate">
                        {t('mpModeBreakdown.roundLabel', {
                          n: round.roundIndex + 1,
                        })}
                      </h4>
                      <p className="text-[10px] text-neo-white/50 truncate">
                        {t(
                          `multiplayerFlow.roomList.gameModes.${round.gameMode === 'word-hunt' ? 'wordHunt' : round.gameMode === 'wheel-rush' ? 'wheelRush' : round.gameMode}`
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Top score display */}
                  <div className="flex flex-col items-end gap-0.5 p-2 rounded bg-neo-navy-light border border-neo-yellow/30">
                    <span className="text-base font-black tabular-nums text-neo-yellow">
                      {topScore.toLocaleString()}
                    </span>
                    <span className="text-[8px] uppercase tracking-wider text-neo-white/60">
                      {t('mpModeBreakdown.topScore')}
                    </span>
                  </div>
                </div>

                {/* Player scores in this round */}
                {round.scores.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-neo-white/10 space-y-1">
                    {round.scores.map((score, idx) => (
                      <div
                        key={`${score.username}-${idx}`}
                        className="flex items-center justify-between gap-2 text-[10px]"
                      >
                        <span className="text-neo-white/70 truncate">
                          {score.username}
                        </span>
                        <div className="flex gap-2">
                          <span className="font-bold text-neo-cyan">
                            {score.score}
                          </span>
                          <span className="text-neo-white/50">
                            {t('mpModeBreakdown.wordCountLabel', {
                              count: score.wordCount,
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </m.div>
          );
        })}
      </m.div>
    </div>
  );
});

MpModeBreakdown.displayName = 'MpModeBreakdown';

export default MpModeBreakdown;
