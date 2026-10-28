'use client';

import { useMemo, useRef } from 'react';
import { Bomb } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { rankBlastMpPlayers } from '@/components/blast/legacy/blastMpRanking';
import { BlastStatChips } from '@/components/blast/results/BlastStatChips';
import { BlastNextGoal } from '@/components/blast/results/BlastNextGoal';
import { TIER_THEME } from '@/components/blast/results/blastResultsTheme';
import { useBlastResultsReveal } from '@/components/blast/results/useBlastResultsReveal';
import type { BlastCollectionScore } from '@/shared/utils/blastCollectionScore';
import {
  fromMpResults,
  toBlastResultsView,
  type BlastMpStats,
} from '@/components/blast/results/blastResultsViewModel';

interface BlastResultsSceneProps {
  playerStats: Record<string, BlastMpStats>;
  scores: Record<string, number>;
  currentUsername?: string;
  collection?: Record<string, BlastCollectionScore>;
}

/** The current player's Blast haul; standings and the score hero live above it. */
export default function BlastResultsScene({ playerStats, scores, currentUsername, collection }: BlastResultsSceneProps) {
  const { t, language, dir } = useLanguage();
  const rootRef = useRef<HTMLDivElement>(null);

  const view = useMemo(() => {
    if (!currentUsername || !playerStats[currentUsername]) return null;
    const ranking = rankBlastMpPlayers(
      Object.entries(scores).map(([username, score]) => ({
        username,
        score,
        wordsFoundCount: 0,
        isCurrentPlayer: username === currentUsername,
      })),
    );
    const input = fromMpResults(ranking, playerStats, collection);
    return input ? toBlastResultsView(input) : null;
  }, [playerStats, scores, currentUsername, collection]);

  useBlastResultsReveal(rootRef, { score: 0, locale: language, confetti: false });

  if (!view) return null;
  const theme = TIER_THEME[view.tier];

  return (
    <div
      ref={rootRef}
      dir={dir}
      data-testid="blast-result-me"
      data-tier={view.tier}
      className={cn('flex flex-col gap-3 rounded-neo border-3 bg-neo-navy p-3 shadow-hard', theme.frame)}
    >
      <div className="flex items-center gap-2">
        <Bomb className={cn('h-5 w-5', theme.headline)} />
        <h3 className="text-sm font-black uppercase tracking-wider text-neo-white">{t('blast.results.sceneTitle')}</h3>
        <span className="ms-auto rounded-neo bg-neo-pink px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-neo-black">
          {t('results.you')}
        </span>
      </div>
      <BlastStatChips view={view} t={t} locale={language} />
      {view.collectionBonus && (
        <div
          data-reveal="chip"
          data-testid="blast-results-bonus"
          className="flex items-center justify-between gap-2 rounded-neo border-3 border-neo-black bg-neo-yellow px-3 py-1.5 text-neo-black shadow-hard"
        >
          <span className="text-[11px] font-black uppercase tracking-wider">{t('blast.mpResults.bonusLabel')}</span>
          <span className="font-neo-display text-lg font-black tabular-nums" dir="ltr">
            {t('blast.mpResults.bonus', { n: view.collectionBonus.total })}
          </span>
        </div>
      )}
      <BlastNextGoal view={view} t={t} locale={language} />
    </div>
  );
}
