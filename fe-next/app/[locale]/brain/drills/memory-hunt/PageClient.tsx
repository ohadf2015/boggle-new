'use client';

import React, { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeRandomUUID } from '@/lib/safeRandomUUID';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigation } from '@/contexts/NavigationContext';
import MemoryHunt from '@/components/drills/MemoryHunt';
import DrillProgressionOverlay from '@/components/brain/DrillProgressionOverlay';
import DrillResearchIntro from '@/components/brain/DrillResearchIntro';
import { useDrillGrid } from '@/hooks/useDrillGrid';
import { useSaveDrillResult, DrillBrainScoreUpdate } from '@/hooks/useSaveDrillResult';
import type { DrillImprovement } from '@/shared/utils/drillImprovement';
import { useDrillRewards } from '@/hooks/useDrillRewards';
import { useDrillLevel } from '@/hooks/useDrillLevel';
import { trackDrillStart } from '@/lib/drills/telemetry';
import { BoostButton } from '@/components/boosts/BoostButton';
import { FeatureErrorBoundary } from '@/components/ErrorBoundaries';

/**
 * Memory Hunt Drill Page
 *
 * Working Memory training drill where players must remember
 * highlighted words and find them on the grid.
 */
export default function MemoryHuntPageClient() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, language, dir } = useLanguage();
  const { setIsInGame } = useNavigation();
  const isDarkMode = theme === 'dark';
  const { saveDrillResult } = useSaveDrillResult();
  const { awardDrillRewards } = useDrillRewards();
  const drillLevel = useDrillLevel('memory-hunt');

  // State for progression overlay
  const [showProgressionOverlay, setShowProgressionOverlay] = useState(false);
  const [brainScoreUpdate, setBrainScoreUpdate] = useState<DrillBrainScoreUpdate | null>(null);
  const [improvement, setImprovement] = useState<DrillImprovement | null>(null);
  const [drillRewards, setDrillRewards] = useState<{ xpAwarded: number; goldAwarded: number } | null>(null);
  const [levelUp, setLevelUp] = useState<{ newLevel: number; previousLevel: number } | null>(null);
  const [sessionId] = useState(() => `drill_memory-hunt_${safeRandomUUID()}`);

  // Generate drill grid
  const { grid, availableWords, isLoading, regenerate } = useDrillGrid(5, language);

  // Hide bottom nav during drill
  React.useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

  const startFiredRef = useRef(false);
  React.useEffect(() => {
    if (isLoading || startFiredRef.current) return;
    startFiredRef.current = true;
    trackDrillStart({ drillType: 'memory-hunt', level: drillLevel });
  }, [isLoading, drillLevel]);

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
      try { sessionStorage.setItem('lex_brain_dirty', '1'); } catch { /* ignore */ }
      setBrainScoreUpdate(saveResult.brainScore);
      setImprovement(saveResult.improvement ?? null);
      if (saveResult.levelPromoted && saveResult.newLevel != null && saveResult.previousLevel != null) {
        setLevelUp({ newLevel: saveResult.newLevel, previousLevel: saveResult.previousLevel });
      } else {
        setLevelUp(null);
      }
      setShowProgressionOverlay(true);
      const rewards = await awardDrillRewards({ level: result.level, score: result.score, xpAwarded: saveResult.xpAwarded ?? 0 });
      setDrillRewards(rewards);
    }
  }, [saveDrillResult, awardDrillRewards]);

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
        <div
          role="status"
          aria-label={t('common.loading')}
          className="w-12 h-12 border-4 border-t-transparent rounded-full border-neo-purple motion-safe:animate-spin"
        />
      </div>
    );
  }

  return (
    <div dir={dir} className={cn(
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

        {/* v1: Drill boosts apply client-side via useBoostClaim's cached token. */}
        {/* Server-side score multiplier deferred to v2 (per spec). */}
        <BoostButton mode="drill" sessionId={sessionId} />
      </header>

      <DrillResearchIntro drillType="memory-hunt" />

      {/* Drill Content */}
      <div className="flex-1">
        <FeatureErrorBoundary featureName="drill-memory-hunt">
          <MemoryHunt
            grid={grid}
            availableWords={availableWords}
            level={drillLevel}
            language={language}
            onComplete={handleComplete}
            onExit={handleExit}
            onPlayAgain={regenerate}
          />
        </FeatureErrorBoundary>
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
          xpAwarded={drillRewards?.xpAwarded}
          goldAwarded={drillRewards?.goldAwarded}
          levelUp={levelUp ?? undefined}
          improvement={improvement ?? undefined}
        />
      )}
    </div>
  );
}
