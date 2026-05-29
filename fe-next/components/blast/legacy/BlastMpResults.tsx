'use client';

import { memo, useMemo } from 'react';
import { m } from 'framer-motion';
import { Bomb, Zap, Grid3x3, Target } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export interface BlastMpPlayerResult {
  username: string;
  score: number;
  wordsFoundCount: number;
  tilesCleared: number;
  bestCombo: number;
  avatar?: { type: string; color: string };
  boardCleared?: boolean;
}

interface BlastMpResultsProps {
  results: BlastMpPlayerResult[];
  gameMode: string;
}

/**
 * Pure mapper: MP scoreboard rows → BlastMpPlayerResult. The board-cleared badge
 * only marks the LOCAL player, since `onMPBoardCleared` (and its store flag) only
 * fires for the client whose move cleared the shared board.
 */
export function buildBlastMpResults(
  scores: Array<{ username: string; score: number; wordsFoundCount?: number }>,
  opts: { boardClearedByLocal: boolean; localUsername?: string },
): BlastMpPlayerResult[] {
  return scores.map((p) => ({
    username: p.username,
    score: p.score,
    wordsFoundCount: p.wordsFoundCount ?? 0,
    tilesCleared: 0,
    bestCombo: 0,
    boardCleared: opts.boardClearedByLocal && p.username === opts.localUsername,
  }));
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const rowVariants = {
  hidden: { opacity: 0, x: -12, scale: 0.96 },
  show: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 280, damping: 22 },
  },
};

const BlastMpResults = memo<BlastMpResultsProps>(({ results, gameMode }) => {
  const { t, dir } = useLanguage();

  const ranked = useMemo(() => {
    return results
      .map((r, idx) => ({ ...r, rank: idx + 1 }))
      .sort((a, b) => b.score - a.score)
      .map((r, idx) => ({ ...r, rank: idx + 1 }));
  }, [results]);

  if (results.length === 0) {
    return (
      <div className="text-center py-6 text-neo-white/60 text-sm">
        {t('mpModeBreakdown.emptyState')}
      </div>
    );
  }

  return (
    <div dir={dir} className="space-y-2">
      <div className="flex items-center gap-2 px-2 py-1">
        <Bomb className="w-4 h-4 text-neo-pink" />
        <h3 className="text-xs font-black uppercase tracking-wider text-neo-white">
          {t('blast.results.sceneTitle')}
        </h3>
      </div>

      <m.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-1"
      >
        {ranked.map((player) => (
          <m.div key={player.username} variants={rowVariants}>
            <div className="relative overflow-hidden rounded-neo border-2 border-neo-pink/50 p-3 bg-linear-to-r from-neo-navy via-neo-navy-light to-neo-navy shadow-hard-sm hover:border-neo-pink transition-colors">
              {/* Board cleared badge */}
              {player.boardCleared && (
                <div className="absolute top-1 right-1">
                  <div className="px-2 py-0.5 rounded-neo bg-neo-yellow text-neo-black text-[8px] font-black uppercase tracking-widest">
                    {t('blast.mpResults.boardCleared')}
                  </div>
                </div>
              )}

              <div className="flex items-start justify-between gap-2">
                {/* Rank + Username + Score */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black text-neo-pink">
                      #{player.rank}
                    </span>
                    <span className="text-sm font-bold text-neo-white truncate">
                      {player.username}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-black tabular-nums text-neo-yellow">
                      {player.score.toLocaleString()}
                    </span>
                    <span className="text-xs uppercase tracking-wider text-neo-white/60">
                      {t('common.score')}
                    </span>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="flex gap-2">
                  {/* Words */}
                  <div className="flex flex-col items-center gap-0.5 p-1.5 rounded bg-neo-navy-light border border-neo-cyan/30">
                    <span className="text-xs font-black text-neo-cyan">
                      {player.wordsFoundCount}
                    </span>
                    <span className="text-[7px] uppercase text-neo-white/50 leading-none">
                      {t('common.words')}
                    </span>
                  </div>

                  {/* Tiles */}
                  <div className="flex flex-col items-center gap-0.5 p-1.5 rounded bg-neo-navy-light border border-neo-lime/30">
                    <Grid3x3 className="w-3 h-3 text-neo-lime" />
                    <span className="text-[7px] uppercase text-neo-white/50 leading-none">
                      {player.tilesCleared}
                    </span>
                  </div>

                  {/* Combo */}
                  <div className="flex flex-col items-center gap-0.5 p-1.5 rounded bg-neo-navy-light border border-neo-orange/30">
                    <Zap className="w-3 h-3 text-neo-orange" />
                    <span className="text-[7px] uppercase text-neo-white/50 leading-none">
                      {player.bestCombo}x
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </m.div>
        ))}
      </m.div>
    </div>
  );
});

BlastMpResults.displayName = 'BlastMpResults';

export default BlastMpResults;
