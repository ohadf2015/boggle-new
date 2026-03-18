'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Zap, Target, Sparkles, Flame, Gem, BookOpen, Trophy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScoreCountUp } from '@/components/results/shared';
import type { BlastPlayerStats } from '@/shared/types/game';

interface BlastResultsSummaryProps {
  movesUsed: number;
  tilesCleared: number;
  tileBonus: number;
  playerStats?: Record<string, BlastPlayerStats>;
}

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 16, scale: 0.95 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring' as const, stiffness: 250, damping: 20 },
  },
};

const cardReduced = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.15 } },
};

const iconBounce = {
  hidden: { scale: 0 },
  show: { scale: 1, transition: { type: 'spring' as const, stiffness: 400, damping: 12, delay: 0.2 } },
};

function StatCell({ icon, value, label, numericValue, reducedMotion }: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  numericValue?: number;
  reducedMotion: boolean | null;
}) {
  return (
    <motion.div
      variants={reducedMotion ? cardReduced : cardVariant}
      className="flex flex-col items-center gap-1"
    >
      <motion.div variants={reducedMotion ? undefined : iconBounce}>
        {icon}
      </motion.div>
      <span className="text-xl font-bold text-neo-white tabular-nums">
        {numericValue !== undefined ? (
          <>{typeof value === 'string' && value.startsWith('+') ? '+' : ''}<ScoreCountUp to={numericValue} duration={1200} delay={reducedMotion ? 0 : 400} /></>
        ) : value}
      </span>
      <span className="text-xs text-neo-cream/70">{label}</span>
    </motion.div>
  );
}

export default function BlastResultsSummary({ movesUsed, tilesCleared, tileBonus, playerStats }: BlastResultsSummaryProps) {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();

  const entries = playerStats ? Object.entries(playerStats) : [];
  const hasRichStats = entries.length > 0;

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-2"
    >
      {/* Mode badge + Basic stats grid */}
      <motion.div
        variants={reducedMotion ? cardReduced : cardVariant}
        className="grid grid-cols-3 gap-2 p-3 bg-neo-navy/50 border-3 border-neo-black rounded-neo shadow-hard-sm border-t-4 border-t-neo-orange"
      >
        <StatCell icon={<Zap className="w-5 h-5 text-neo-yellow" />} numericValue={movesUsed} value={movesUsed} label={t('blast.multiplayer.moves')} reducedMotion={reducedMotion} />
        <StatCell icon={<Target className="w-5 h-5 text-neo-orange" />} numericValue={tilesCleared} value={tilesCleared} label={t('blast.multiplayer.tilesCleared')} reducedMotion={reducedMotion} />
        <StatCell icon={<Sparkles className="w-5 h-5 text-neo-cyan" />} value={`+${tileBonus}`} numericValue={tileBonus} label={t('blast.multiplayer.tileBonus')} reducedMotion={reducedMotion} />
      </motion.div>

      {/* Rich per-player stats cards */}
      {hasRichStats && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neo-cream/60 px-1">
            {t('blast.multiplayer.playerStats')}
          </h4>
          {entries.map(([username, stats]) => (
            <motion.div
              key={username}
              variants={reducedMotion ? cardReduced : cardVariant}
              className="p-3 bg-neo-navy/50 border-3 border-neo-black rounded-neo shadow-hard-sm"
            >
              <div className="font-bold text-neo-white text-sm mb-2">{username}</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <StatCell
                  icon={<Flame className="w-4 h-4 text-neo-orange" />}
                  numericValue={stats.maxCombo}
                  value={stats.maxCombo}
                  label={t('blast.multiplayer.maxCombo')}
                  reducedMotion={reducedMotion}
                />
                <StatCell
                  icon={<Gem className="w-4 h-4 text-neo-cyan" />}
                  numericValue={stats.gemsCollected}
                  value={stats.gemsCollected}
                  label={t('blast.multiplayer.gems')}
                  reducedMotion={reducedMotion}
                />
                <StatCell
                  icon={<BookOpen className="w-4 h-4 text-neo-lime" />}
                  numericValue={stats.wordsFound.length}
                  value={stats.wordsFound.length}
                  label={t('blast.multiplayer.wordsFoundCount')}
                  reducedMotion={reducedMotion}
                />
              </div>
              {stats.bestWord && (
                <div className="mt-2 flex items-center gap-1.5 justify-center">
                  <Trophy className="w-3.5 h-3.5 text-neo-yellow" />
                  <span className="text-xs text-neo-cream/70">{t('blast.multiplayer.bestWord')}:</span>
                  <span className="font-bold text-neo-white text-sm uppercase">{stats.bestWord}</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
