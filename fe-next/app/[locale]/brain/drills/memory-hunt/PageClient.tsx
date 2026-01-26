'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigation } from '@/contexts/NavigationContext';
import MemoryHunt from '@/components/drills/MemoryHunt';
import DrillProgressionOverlay from '@/components/brain/DrillProgressionOverlay';
import { useDrillGrid } from '@/hooks/useDrillGrid';
import { useSaveDrillResult, DrillBrainScoreUpdate } from '@/hooks/useSaveDrillResult';

/**
 * Memory Hunt Drill Page
 *
 * Working Memory training drill where players must remember
 * highlighted words and find them on the grid.
 */
export default function MemoryHuntPageClient() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const { setIsInGame } = useNavigation();
  const isDarkMode = theme === 'dark';
  const { saveDrillResult } = useSaveDrillResult();

  // State for progression overlay
  const [showProgressionOverlay, setShowProgressionOverlay] = useState(false);
  const [brainScoreUpdate, setBrainScoreUpdate] = useState<DrillBrainScoreUpdate | null>(null);

  // Generate drill grid
  const { grid, availableWords, isLoading } = useDrillGrid(5, language);

  // Hide bottom nav during drill
  React.useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

  const handleComplete = useCallback(async (result: {
    score: number;
    wordsFound: number;
    totalWords: number;
    timeSpent: number;
    level: number;
  }) => {
    const saveResult = await saveDrillResult({
      drillType: 'memory-hunt',
      level: result.level,
      score: result.score,
      durationSeconds: result.timeSpent,
      wordsFound: result.wordsFound,
      extraData: {
        totalWords: result.totalWords,
      },
    });

    // Show progression overlay if we got brainScore data back
    if (saveResult.success && saveResult.brainScore) {
      setBrainScoreUpdate(saveResult.brainScore);
      setShowProgressionOverlay(true);
    }
  }, [saveDrillResult]);

  const handleExit = useCallback(() => {
    router.push(`/${language}/brain`);
  }, [router, language]);

  const handleBack = useCallback(() => {
    router.push(`/${language}/brain`);
  }, [router, language]);

  if (isLoading || grid.length === 0) {
    return (
      <div className={cn(
        'flex-1 flex items-center justify-center',
        isDarkMode ? 'bg-neo-navy' : 'bg-neo-cream'
      )}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className={cn(
            'w-12 h-12 border-4 border-t-transparent rounded-full',
            isDarkMode ? 'border-neo-purple' : 'border-neo-purple'
          )}
        />
      </div>
    );
  }

  return (
    <div className={cn(
      'flex-1 flex flex-col',
      isDarkMode ? 'bg-neo-navy' : 'bg-neo-cream'
    )}>
      {/* Header */}
      <header className={cn(
        'flex items-center justify-between px-4 py-3',
        'border-b-4 border-neo-black',
        isDarkMode ? 'bg-neo-navy' : 'bg-neo-cream'
      )}>
        <button
          onClick={handleBack}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-neo',
            'border-3 border-neo-black shadow-hard-sm',
            'transition-all hover:translate-y-[-2px] hover:shadow-hard',
            isDarkMode ? 'bg-neo-navy text-neo-white' : 'bg-neo-cream text-neo-black'
          )}
        >
          <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          <span className="font-bold text-sm hidden sm:inline">{t('common.back')}</span>
        </button>

        <h1 className={cn(
          'text-lg font-black uppercase tracking-wide',
          isDarkMode ? 'text-neo-white' : 'text-neo-black'
        )}>
          {t('brain.drills.memory-hunt.name')}
        </h1>

        <div className="w-10" /> {/* Spacer */}
      </header>

      {/* Drill Content */}
      <div className="flex-1">
        <MemoryHunt
          grid={grid}
          availableWords={availableWords}
          level={1}
          language={language}
          onComplete={handleComplete}
          onExit={handleExit}
        />
      </div>

      {/* Brain Score Progression Overlay */}
      {brainScoreUpdate && (
        <DrillProgressionOverlay
          isOpen={showProgressionOverlay}
          onClose={() => setShowProgressionOverlay(false)}
          targetDomain={brainScoreUpdate.targetDomain}
          newDomainScore={brainScoreUpdate.domainScores[brainScoreUpdate.targetDomain]}
          scoreDelta={brainScoreUpdate.scoreDelta}
          overallScore={brainScoreUpdate.overallScore}
          tier={brainScoreUpdate.tier}
        />
      )}
    </div>
  );
}
