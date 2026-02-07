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
import type { PlayerArchetype } from '@/utils/playerArchetypes';

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
  /** Total combo bonus earned */
  totalComboBonus?: number;
  /** Total fire round bonus earned */
  totalFireRoundBonus?: number;
  /** Player archetype (moved from Results tab) */
  playerArchetype?: PlayerArchetype | null;
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
  totalComboBonus = 0,
  totalFireRoundBonus = 0,
  playerArchetype,
}: MobileDetailsTabProps): React.ReactElement {
  return (
    <div className="space-y-3">
      {/* Your Words - DEFAULT OPEN */}
      {results.playerWordData && results.playerWordData.length > 0 && (
        <YourWordsSection
          wordsByPoints={wordsByPoints}
          sortedPointGroups={sortedPointGroups}
          invalidWords={invalidWords}
          wordCount={results.playerWordData.length}
          title={t('results.yourWords') || 'Your Words'}
          t={t}
          defaultExpanded={true}
        />
      )}

      {/* Performance - includes archetype now */}
      {playerInsights && (
        <PerformanceSection
          insights={playerInsights}
          title={t('results.performanceDetails') || 'Performance Details'}
          archetype={playerArchetype}
        />
      )}

      {/* Missed Words */}
      {mode === 'solo-bots' && missedWords.length > 0 && (
        <MissedWords missedWords={missedWords} maxDisplay={5} />
      )}

      {/* Bot Words */}
      {mode === 'solo-bots' && botWordDetails.length > 0 && (
        <BotWordsSection
          botWordDetails={botWordDetails}
          language={gameLanguage}
          title={t('singlePlayer.botWordsFound') || 'Bot Words Found'}
          t={t}
          defaultExpanded={false}
        />
      )}

      {/* Achievements - collapsed by default */}
      {results.achievements && results.achievements.length > 0 && (
        <AchievementsSection
          achievements={results.achievements}
          title={t('hostView.achievements') || 'Achievements'}
          disclaimer={t('singlePlayer.achievementsNotSaved') || 'Achievements in single player mode are not saved to your profile.'}
          defaultExpanded={false}
        />
      )}

      {/* History Chart */}
      <CollapsibleSection
        title={t('results.performanceHistory') || 'Performance History'}
        icon={<TrendingUp className="w-4 h-4" />}
        defaultExpanded={false}
        variant="tertiary"
        className="shadow-hard"
      >
        <PerformanceChart currentScore={results.playerScore} gamesLimit={10} />
      </CollapsibleSection>

      {/* NEW: Bonuses section */}
      {(totalComboBonus > 0 || totalFireRoundBonus > 0) && (
        <CollapsibleSection
          title={t('results.bonuses') || 'Bonuses'}
          defaultExpanded={false}
          variant="tertiary"
          className="shadow-hard"
        >
          <div className="space-y-2 p-3">
            {totalComboBonus > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-white/60">{t('results.comboBonus') || 'Combo Bonus'}</span>
                <span className="font-bold text-neo-cyan">+{totalComboBonus}</span>
              </div>
            )}
            {totalFireRoundBonus > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-white/60">{t('results.fireRoundBonus') || 'Fire Round'}</span>
                <span className="font-bold text-neo-orange">+{totalFireRoundBonus}</span>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}
