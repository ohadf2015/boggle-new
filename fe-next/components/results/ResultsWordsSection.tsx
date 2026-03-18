'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import type { Player } from '@/components/results/types';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import { StatsCardGrid } from '@/components/results/shared';
import { WordPointsGroup, InvalidWordsSection } from '@/components/results/WordPointsGroup';
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
      {/* Stats Row */}
      {currentPlayerRank > 0 && isStatsVisible && (
        <motion.div
          initial={reducedMotion ? undefined : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 20, delay: statsDelay }}
        >
          <StatsCardGrid
            cards={[
              { label: t('results.words'), value: currentPlayerValidWords.length, icon: '\ud83d\udcdd' },
              {
                label: t('results.bestCombo'),
                value: (() => {
                  const words = currentPlayerData?.allWords ?? [];
                  const maxCombo = words.reduce((max, w) => Math.max(max, w.comboBonus ?? 0), 0);
                  return maxCombo > 0 ? `x${maxCombo}` : '-';
                })(),
                icon: '\u26a1',
                accent: 'amber',
              },
              {
                label: t('results.bestWord'),
                value: currentPlayerValidWords.length > 0
                  ? currentPlayerValidWords.reduce((a, b) => a.word.length >= b.word.length ? a : b).word.toUpperCase()
                  : '-',
                icon: '\u2b50',
                accent: 'lime',
              },
            ]}
            variant="grid"
          />
        </motion.div>
      )}

      {/* Top Achievements */}
      {gameAchievements.length > 0 && isStatsVisible && (
        <motion.div
          initial={reducedMotion ? undefined : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: statsDelay + 0.15 }}
          className="flex items-center gap-2 flex-wrap justify-center py-2"
        >
          <span className="text-[10px] font-black uppercase tracking-widest text-neo-cream/40 w-full text-center mb-0.5">
            {t('results.badges')}
          </span>
          {gameAchievements.map((ach, i) => (
            <AchievementBadge
              key={ach.key || ach.name || `ach-${i}`}
              achievement={ach}
              index={i}
            />
          ))}
        </motion.div>
      )}

      {/* Your Words — grouped by points */}
      {currentPlayerValidWords.length > 0 && isWordsVisible && (
        <motion.div
          initial={reducedMotion ? undefined : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 20, delay: wordsDelay }}
        >
          <CollapsibleSection
            title={t('results.yourWords')}
            icon={<BookOpen className="w-4 h-4" />}
            badge={currentPlayerValidWords.length}
            summary={[
              currentPlayerValidWords.length > 0
                ? `${t('results.bestWord')}: ${currentPlayerValidWords.reduce((a, b) => a.word.length >= b.word.length ? a : b).word.toUpperCase()}`
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
        </motion.div>
      )}
    </>
  );
};

export default ResultsWordsSection;
