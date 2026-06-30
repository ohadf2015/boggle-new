'use client';

import { m, useReducedMotion } from 'framer-motion';
import { Bomb, Flame, Gem, LayoutGrid, Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { BlastPlayerStats } from '@/shared/types/game';

interface BlastResultsSceneProps {
  playerStats: Record<string, BlastPlayerStats>;
  scores: Record<string, number>;
  currentUsername?: string;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};
const row = {
  hidden: { y: 18, scale: 0.96 },
  show: { y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 280, damping: 22 } },
};
const reduced = { hidden: {}, show: { transition: { duration: 0.15 } } };

function StatChip({ icon, value, label, accent }: {
  icon: React.ReactNode; value: React.ReactNode; label: string; accent: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`flex items-center gap-1 ${accent}`}>{icon}
        <span className="text-base font-black tabular-nums">{value}</span>
      </span>
      <span className="text-[9px] uppercase tracking-wider text-neo-white">{label}</span>
    </div>
  );
}

export default function BlastResultsScene({ playerStats, currentUsername }: BlastResultsSceneProps) {
  const { t } = useLanguage();
  const prefersReduced = useReducedMotion();
  const v = prefersReduced ? reduced : row;

  // Current player's blast stats only. Opponent standings (rank·name·combo·
  // score) live in BlastMpResults directly above this scene — rendering them
  // here too was a second copy of the same list, so this scene now contributes
  // ONLY the blast-specific stat card the standings can't carry.
  const me = useMemo(() => {
    if (!currentUsername || !playerStats[currentUsername]) return null;
    return { username: currentUsername, stats: playerStats[currentUsername] };
  }, [playerStats, currentUsername]);

  if (!me) return null;

  return (
    <m.div variants={container} initial="hidden" animate="show" className="space-y-3">
      <m.div variants={v} className="flex items-center gap-2 px-1 animate-in fade-in-0 duration-300">
        <Bomb className="w-5 h-5 text-neo-lime" />
        <h3 className="text-sm font-black uppercase tracking-wider text-neo-white">
          {t('blast.results.sceneTitle')}
        </h3>
      </m.div>

      {/* Current user's Blast stats — the blast-specific payload the shared
          results hero (rank + score + avatar, rendered just above) doesn't
          carry. Deliberately omits score/rank/username to avoid stacking a
          second "me card" on top of the hero. */}
      {me && (
        <m.div
          variants={v}
          data-testid="blast-result-me"
          className="relative overflow-hidden p-4 rounded-neo border-3 border-neo-pink shadow-hard bg-linear-to-br from-neo-navy via-neo-navy-light to-neo-navy shadow-[0_0_18px_rgba(255,20,147,0.4)] animate-in fade-in-0 duration-300"
        >
          {!prefersReduced && (
            <m.div
              aria-hidden
              className="absolute inset-0 bg-linear-to-br from-neo-pink/10 via-neo-purple/10 to-neo-cyan/10 pointer-events-none"
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          <div className="relative">
            <span className="inline-block mb-2 px-1.5 py-0.5 rounded-neo bg-neo-pink text-neo-black text-[10px] font-black uppercase tracking-wide">
              {t('results.you')}
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              <StatChip icon={<Flame className="w-4 h-4" />} value={`${me.stats.maxCombo}x`} label={t('blast.results.comboChain')} accent="text-neo-orange" />
              <StatChip icon={<Gem className="w-4 h-4" />} value={me.stats.gemsCollected} label={t('blast.results.gemsCollected')} accent="text-neo-cyan" />
              <StatChip icon={<Bomb className="w-4 h-4" />} value={me.stats.tilesCleared} label={t('blast.results.tilesCleared')} accent="text-neo-lime" />
              <StatChip icon={<LayoutGrid className="w-4 h-4" />} value={me.stats.boardClears} label={t('blast.results.boardClears')} accent="text-neo-purple" />
            </div>
            {me.stats.bestWord && (
              <div className="mt-3 flex items-center gap-1.5 justify-center pt-2 border-t-2 border-neo-black/40">
                <Trophy className="w-3.5 h-3.5 text-neo-yellow" />
                <span className="text-[10px] uppercase tracking-wider text-neo-white">
                  {t('blast.results.bestWord')}:
                </span>
                <span className="font-bold text-neo-white text-sm uppercase">{me.stats.bestWord}</span>
              </div>
            )}
          </div>
        </m.div>
      )}
    </m.div>
  );
}
