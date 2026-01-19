'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { TrendingUp } from 'lucide-react';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import MissedWords from '@/components/results/MissedWords';
import { PerformanceSection } from './PerformanceSection';
import { YourWordsSection } from './YourWordsSection';
import { AchievementsSection } from './AchievementsSection';
import { BotWordsSection } from './BotWordsSection';
import type { SinglePlayerMode } from '../../SinglePlayerView';
import type { PlayerInsights, WordsByPoints, BotWordDetail, InvalidWord, MissedWord } from '../useResultsData';

const PerformanceChart = dynamic(() => import('@/components/results/PerformanceChart'), { ssr: false });

interface MobileDetailsTabProps {
  results: {
    playerScore: number;
    playerWordData?: { word: string; score: number; isValid: boolean }[];
    achievements?: { key: string; icon: string }[];
    language?: string;
  };
  mode: SinglePlayerMode;
  gameLanguage: string;
  playerInsights: PlayerInsights | null;
  wordsByPoints: WordsByPoints;
  sortedPointGroups: number[];
  invalidWords: InvalidWord[];
  botWordDetails: BotWordDetail[];
  missedWords: MissedWord[];
  t: (key: string) => string | undefined;
}

export function MobileDetailsTab({
  results,
  mode,
  gameLanguage,
  playerInsights,
  wordsByPoints,
  sortedPointGroups,
  invalidWords,
  botWordDetails,
  missedWords,
  t,
}: MobileDetailsTabProps): React.ReactElement {
  return (
    <div className="space-y-3">
      {playerInsights && (
        <PerformanceSection
          insights={playerInsights}
          title={t('results.performanceDetails') || 'Performance Details'}
        />
      )}

      {results.playerWordData && results.playerWordData.length > 0 && (
        <YourWordsSection
          wordsByPoints={wordsByPoints}
          sortedPointGroups={sortedPointGroups}
          invalidWords={invalidWords}
          wordCount={results.playerWordData.length}
          title={t('results.yourWords') || 'Your Words'}
          t={t}
        />
      )}

      <CollapsibleSection
        title={t('results.performanceHistory') || 'Performance History'}
        icon={<TrendingUp className="w-4 h-4" />}
        defaultExpanded={false}
        variant="tertiary"
        className="shadow-hard"
      >
        <PerformanceChart currentScore={results.playerScore} gamesLimit={10} />
      </CollapsibleSection>

      {mode === 'solo-bots' && missedWords.length > 0 && (
        <MissedWords missedWords={missedWords} maxDisplay={5} />
      )}

      {results.achievements && results.achievements.length > 0 && (
        <AchievementsSection
          achievements={results.achievements}
          title={t('hostView.achievements') || 'Achievements'}
          disclaimer={t('singlePlayer.achievementsNotSaved') || 'Achievements in single player mode are not saved to your profile.'}
          defaultExpanded={true}
        />
      )}

      {mode === 'solo-bots' && botWordDetails.length > 0 && (
        <BotWordsSection
          botWordDetails={botWordDetails}
          language={gameLanguage}
          title={t('singlePlayer.botWordsFound') || 'Bot Words Found'}
          t={t}
          defaultExpanded={false}
        />
      )}
    </div>
  );
}
