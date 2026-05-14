'use client';

import { m, useReducedMotion } from 'framer-motion';
import { Bomb, Crown, Flame, Gem, LayoutGrid, Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScoreCountUp } from '@/components/results/shared';
import type { BlastPlayerStats } from '@/shared/types/game';

interface BlastResultsSceneProps {
  playerStats: Record<string, BlastPlayerStats>;
  scores: Record<string, number>;
  currentUsername?: string;
}

const PLAYER_ACCENTS = [
  { text: 'text-neo-lime', border: 'border-neo-lime', glow: 'shadow-[0_0_14px_rgba(191,255,0,0.45)]' },
  { text: 'text-neo-pink', border: 'border-neo-pink', glow: 'shadow-[0_0_14px_rgba(255,20,147,0.45)]' },
  { text: 'text-neo-cyan', border: 'border-neo-cyan', glow: 'shadow-[0_0_14px_rgba(0,255,255,0.45)]' },
  { text: 'text-neo-purple', border: 'border-neo-purple', glow: 'shadow-[0_0_14px_rgba(139,92,246,0.45)]' },
  { text: 'text-neo-yellow', border: 'border-neo-yellow', glow: 'shadow-[0_0_14px_rgba(250,204,21,0.45)]' },
  { text: 'text-neo-red', border: 'border-neo-red', glow: 'shadow-[0_0_14px_rgba(255,51,102,0.45)]' },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};
const row = {
  hidden: { opacity: 0, y: 20, scale: 0.94 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 280, damping: 22 } },
};
const reduced = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.15 } } };

function StatChip({ icon, value, label, accent }: {
  icon: React.ReactNode; value: React.ReactNode; label: string; accent: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`flex items-center gap-1 ${accent}`}>{icon}
        <span className="text-sm font-black tabular-nums">{value}</span>
      </span>
      <span className="text-[9px] uppercase tracking-wider text-neo-cream/50">{label}</span>
    </div>
  );
}

export default function BlastResultsScene({ playerStats, scores, currentUsername }: BlastResultsSceneProps) {
  const { t } = useLanguage();
  const prefersReduced = useReducedMotion();
  const v = prefersReduced ? reduced : row;

  const ranked = useMemo(() => {
    return Object.keys(playerStats)
      .map((username) => ({ username, stats: playerStats[username], score: scores[username] ?? 0 }))
      .sort((a, b) => b.score - a.score);
  }, [playerStats, scores]);

  if (ranked.length === 0) return null;

  const accentFor = (i: number) => PLAYER_ACCENTS[i % PLAYER_ACCENTS.length];

  return (
    <m.div variants={container} initial="hidden" animate="show" className="space-y-3">
      <m.div variants={v} className="flex items-center gap-2 px-1">
        <Bomb className="w-5 h-5 text-neo-lime" />
        <h3 className="text-sm font-black uppercase tracking-wider text-neo-cream/80">
          {t('blast.results.sceneTitle')}
        </h3>
      </m.div>

      <div className="space-y-2">
        {ranked.map(({ username, stats, score }, idx) => {
          const accent = accentFor(idx);
          const isMe = username === currentUsername;
          return (
            <m.div
              key={username}
              variants={v}
              data-testid="blast-result-row"
              className={`relative overflow-hidden p-3 rounded-neo border-3 border-neo-black shadow-hard bg-linear-to-br from-neo-navy via-neo-navy-light to-neo-navy ${idx === 0 ? accent.glow : ''} ${isMe ? `border-l-4 ${accent.border}` : ''}`}
            >
              {idx === 0 && !prefersReduced && (
                <m.div
                  aria-hidden
                  className="absolute inset-0 bg-linear-to-br from-neo-pink/10 via-neo-orange/10 to-neo-lime/10 pointer-events-none"
                  animate={{ opacity: [0.35, 0.75, 0.35] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
              <div className="relative">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {idx === 0 && <Crown className="w-4 h-4 text-neo-yellow shrink-0" />}
                    <span className={`text-sm font-bold truncate ${isMe ? 'text-neo-white' : 'text-neo-cream/80'}`}>
                      {username}
                    </span>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className={`text-2xl font-black tabular-nums leading-none ${accent.text}`}>
                      <ScoreCountUp to={score} duration={1300} delay={prefersReduced ? 0 : 300 + idx * 120} />
                    </span>
                    <span className="text-[9px] uppercase tracking-wider text-neo-cream/50">
                      {t('blast.results.finalScore')}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1.5 pt-2 border-t-2 border-neo-black/40">
                  <StatChip icon={<Flame className="w-3 h-3" />} value={`${stats.maxCombo}x`} label={t('blast.results.comboChain')} accent="text-neo-orange" />
                  <StatChip icon={<Gem className="w-3 h-3" />} value={stats.gemsCollected} label={t('blast.results.gemsCollected')} accent="text-neo-cyan" />
                  <StatChip icon={<Bomb className="w-3 h-3" />} value={stats.tilesCleared} label={t('blast.results.tilesCleared')} accent="text-neo-lime" />
                  <StatChip icon={<LayoutGrid className="w-3 h-3" />} value={stats.boardClears} label={t('blast.results.boardClears')} accent="text-neo-purple" />
                </div>
                {stats.bestWord && (
                  <div className="mt-2 flex items-center gap-1.5 justify-center">
                    <Trophy className="w-3.5 h-3.5 text-neo-yellow" />
                    <span className="text-[10px] uppercase tracking-wider text-neo-cream/50">
                      {t('blast.results.bestWord')}:
                    </span>
                    <span className="font-bold text-neo-white text-sm uppercase">{stats.bestWord}</span>
                  </div>
                )}
              </div>
            </m.div>
          );
        })}
      </div>
    </m.div>
  );
}
