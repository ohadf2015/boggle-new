import dynamic from 'next/dynamic';
import { TrendingUp } from 'lucide-react';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import type { PlayerArchetype } from '@/utils/playerArchetypes';
import type { SinglePlayerMode, SinglePlayerResultsData } from '../../SinglePlayerView';
import type { BotWordDetail, InvalidWord, PlayerInsights, WordsByPoints } from '../useResultsData';
import { YourWordsSection, PerformanceSection, BotWordsSection, AchievementsSection } from '..';

const PerformanceChart = dynamic(() => import('@/components/results/PerformanceChart'), { ssr: false });

interface Props {
  results: SinglePlayerResultsData;
  mode: SinglePlayerMode;
  isDesktop: boolean;
  gameLanguage: string;
  wordsByPoints: WordsByPoints;
  sortedPointGroups: number[];
  invalidWords: InvalidWord[];
  playerInsights: PlayerInsights | null;
  playerArchetype: PlayerArchetype | null;
  botWordDetails: BotWordDetail[];
  t: (key: string) => string;
}

export function SoloAnalysisBlock({
  results, mode, isDesktop, gameLanguage, wordsByPoints, sortedPointGroups, invalidWords,
  playerInsights, playerArchetype, botWordDetails, t,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 md:gap-3">
        <div className="w-1 md:w-1.5 h-6 md:h-8 bg-neo-lime rounded-full" />
        <h3 className="text-[10px] sm:text-xs font-black text-white uppercase tracking-wider md:tracking-[0.2em]">
          {t('results.detailedAnalysis')}
        </h3>
        {isDesktop && <div className="flex-1 h-px bg-white/10" />}
      </div>
      <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-5 lg:space-y-0 lg:items-start">
        <div className="space-y-3">
          {results.playerWordData && results.playerWordData.length > 0 && (
            <YourWordsSection wordsByPoints={wordsByPoints} sortedPointGroups={sortedPointGroups}
              invalidWords={invalidWords} wordCount={results.playerWordData.length}
              title={t('results.yourWords')} t={t} defaultExpanded={false} />
          )}
          {playerInsights && (
            <PerformanceSection insights={playerInsights} title={t('results.performanceDetails')} archetype={playerArchetype} />
          )}
          <CollapsibleSection title={t('results.performanceHistory')} icon={<TrendingUp className="w-4 h-4" />}
            defaultExpanded={false} variant="tertiary" className="shadow-hard">
            <PerformanceChart currentScore={results.playerScore} gamesLimit={10} />
          </CollapsibleSection>
        </div>
        <div className="space-y-3">
          {mode === 'solo-bots' && botWordDetails.length > 0 && (
            <BotWordsSection botWordDetails={botWordDetails} language={gameLanguage}
              title={t('singlePlayer.botWordsFound')} t={t} defaultExpanded={false} />
          )}
          {results.achievements && results.achievements.length > 4 && (
            <AchievementsSection achievements={results.achievements} title={t('hostView.achievements')}
              disclaimer={t('singlePlayer.achievementsNotSaved')} defaultExpanded={false} />
          )}
        </div>
      </div>
    </div>
  );
}
