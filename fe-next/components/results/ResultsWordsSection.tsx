'use client';

import React from 'react';
import { m } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import type { Player } from '@/components/results/types';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import { WordPointsGroup, InvalidWordsSection } from '@/components/results/WordPointsGroup';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWordCategories } from '@/components/results/useWordCategories';
import { AchievementBadge } from '@/components/AchievementBadge';
import { filterGameAchievements } from '@/components/results/utils';

type TFunction = (key: string, params?: Record<string, string | number>) => string;

interface ResultsWordsSectionProps {
  currentPlayerData: Player;
  currentPlayerValidWords: Array<{ word: string; score: number }>;
  currentPlayerRank: number;
  reducedMotion: boolean | null;
  statsDelay: number;
  wordsDelay: number;
  isStatsVisible: boolean;
  isWordsVisible: boolean;
  t: TFunction;
}

export const ResultsWordsSection: React.FC<ResultsWordsSectionProps> = ({
  currentPlayerData,
  currentPlayerValidWords,
  currentPlayerRank,
  reducedMotion,
  statsDelay,
  wordsDelay,
  isStatsVisible,
  isWordsVisible,
  t,
}) => {
  const { language } = useLanguage();
  const formatWord = (word: string) => {
    const w = language === 'he' ? applyHebrewFinalLetters(word) : word;
    return w.toUpperCase();
  };

  // Top achievements earned this game (max 3 shown as highlight)
  const gameAchievements = React.useMemo(() => {
    if (!currentPlayerData?.achievements) return [];
    return filterGameAchievements(currentPlayerData.achievements, currentPlayerData.allWords).slice(0, 3);
  }, [currentPlayerData]);

  // Rich word categorization for "Your Words" section
  const {
    wordsByPoints,
    sortedPointGroups,
    invalidWords: playerInvalidWords,
    totalComboBonus,
    totalFireRoundBonus,
  } = useWordCategories(currentPlayerData?.allWords);

  return (
    <>
      {/* Top Achievements — pop in with slight rotate */}
      {gameAchievements.length > 0 && isStatsVisible && (
        <m.div
          initial={reducedMotion ? undefined : { opacity: 0, scale: 0.9, rotate: -1 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 250, damping: 16, delay: statsDelay + 0.18 }}
          className="flex items-center gap-2 flex-wrap justify-center py-2"
        >
          <span className="text-[10px] font-black uppercase tracking-widest text-neo-white w-full text-center mb-0.5">
            {t('results.badges')}
          </span>
          {gameAchievements.map((ach, i) => (
            <AchievementBadge
              key={ach.key || ach.name || `ach-${i}`}
              achievement={ach}
              index={i}
            />
          ))}
        </m.div>
      )}

      {/* Your Words — grouped by points, slides up */}
      {currentPlayerValidWords.length > 0 && isWordsVisible && (
        <m.div
          initial={reducedMotion ? undefined : { opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 18, delay: wordsDelay }}
        >
          <CollapsibleSection
            title={t('results.yourWords')}
            icon={<BookOpen className="w-4 h-4" />}
            badge={currentPlayerValidWords.length}
            summary={[
              currentPlayerValidWords.length > 0
                ? `${t('results.bestWord')}: ${formatWord(currentPlayerValidWords.reduce((a, b) => a.word.length >= b.word.length ? a : b).word)}`
                : undefined,
              totalComboBonus > 0 ? `\u26a1 +${totalComboBonus}` : undefined,
              totalFireRoundBonus > 0 ? `\ud83d\udd25 +${totalFireRoundBonus}` : undefined,
            ].filter(Boolean).join(' \u00b7 ')}
            defaultExpanded={false}
            variant="tertiary"
            className="shadow-hard"
          >
            <div className="space-y-2">
              {sortedPointGroups.length > 0 && (
                <WordPointsGroup
                  wordsByPoints={wordsByPoints}
                  sortedPointGroups={sortedPointGroups}
                  t={t}
                  mode="simple"
                  animate
                />
              )}
              {playerInvalidWords.length > 0 && (
                <InvalidWordsSection
                  invalidWords={playerInvalidWords}
                  t={t}
                  mode="simple"
                />
              )}
            </div>
          </CollapsibleSection>
        </m.div>
      )}
    </>
  );
};

export default ResultsWordsSection;
