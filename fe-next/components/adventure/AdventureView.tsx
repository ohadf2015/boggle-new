'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { FeatureErrorBoundary } from '@/components/ErrorBoundaries';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useProgression } from '@/contexts/ProgressionContext';
import { useMusic } from '@/contexts/MusicContext';
import type { UpgradeState } from '@/lib/adventure/upgradeConfig';
import { useAdventureMusic } from '@/hooks/useAdventureMusic';
import { useDailyQuests } from '@/hooks/useDailyQuests';
import { getWeeklyChallengeConfig } from '@/lib/adventure/weeklyChallenge';
import {
  getWorldConfig,
  getLevelConfig,
  generateAdventureGrid,
  getLevelSeed,
  getGridSize,
  LEVELS_PER_WORLD,
  WORLD_CONFIGS,
} from '@/lib/adventure';
import { calculateMasteryTier } from '@/lib/adventure/mastery';
import type { MasteryCriteria, MasteryTier } from '@/types/adventure';
import dynamic from 'next/dynamic';
import { AdventureThemeProvider } from '@/contexts/AdventureThemeContext';

import AdventureHub from './AdventureHub';
import AdventureViewHeader from './AdventureViewHeader';
import AdventureViewModals from './AdventureViewModals';
import AdventureShopFAB from './AdventureShopFAB';
import WorldMap from './WorldMap';
import LevelGrid from './LevelGrid';
import { useAdventureHistory } from './useAdventureHistory';

const AdventureGame = dynamic(() => import('./AdventureGame'), { ssr: false, loading: () => <div className="h-screen bg-neo-navy flex items-center justify-center"><Loader2 className="w-12 h-12 text-neo-yellow animate-spin" /></div> });

interface GameTimerState {
  timeRemaining: number;
  totalTime: number;
  isPlaying: boolean;
  isPaused: boolean;
}

function AdventureView(): React.JSX.Element {
  const { t, dir, language } = useLanguageSafe();
  const isRTL = dir === 'rtl';
  const { progression, isLoading, error, completeLevel, updateCurrency } = useProgression();

  const gold = progression?.gold ?? 0;
  const upgrades = (progression?.upgrades ?? {}) as Record<string, number>;

  const [showShop, setShowShop] = useState(false);
  const [showWordAlbum, setShowWordAlbum] = useState(false);
  const [showWeeklyChallenge, setShowWeeklyChallenge] = useState(false);

  const { stopMusic: stopGlobalMusic } = useMusic();

  const hasCompletions = (progression?.completions?.length ?? 0) > 0;
  const {
    viewState, setViewState,
    selectedWorld, selectedLevel, setSelectedLevel,
    navigateToWorldMap, selectWorld, selectLevel,
    openWorldMapFromHub, historyBack,
  } = useAdventureHistory(hasCompletions ? 'hub' : 'worldMap');

  const [gameTimerState, setGameTimerState] = useState<GameTimerState>({
    timeRemaining: 0, totalTime: 0, isPlaying: false, isPaused: false,
  });

  useEffect(() => { stopGlobalMusic(500); }, [stopGlobalMusic]);

  const currentMusicWorld = selectedWorld || 1;
  useAdventureMusic({
    worldNumber: currentMusicWorld,
    isPlaying: viewState === 'playing' ? gameTimerState.isPlaying : true,
    isPaused: viewState === 'playing' ? gameTimerState.isPaused : false,
    timeRemaining: viewState === 'playing' ? gameTimerState.timeRemaining : 0,
    totalTime: viewState === 'playing' ? gameTimerState.totalTime : 0,
    enabled: true,
  });

  const handleTimerStateChange = setGameTimerState;

  const totalStars = progression?.totalStars ?? 0;
  const playerLevel = progression?.playerLevel ?? 1;
  const completions = useMemo(() => progression?.completions ?? [], [progression?.completions]);
  const router = useRouter();
  // Boss rush unlocks after defeating at least 1 boss (level 7 in any world)
  const hasBossDefeat = useMemo(() => completions.some(c => c.level === LEVELS_PER_WORLD && c.stars >= 1), [completions]);
  const streakDays = progression?.streak?.currentStreak ?? 0;
  const bestStreak = progression?.streak?.bestStreak ?? 0;

  // Compute per-world mastery tiers from available progression data
  const masteryTiers = useMemo(() => {
    const tiers: Record<number, MasteryTier> = {};
    for (const wc of WORLD_CONFIGS) {
      const wId = wc.id;
      const wCompletions = completions.filter(c => c.world === wId);
      const completed = wCompletions.filter(c => c.stars >= 1).length;
      const perfect = wCompletions.filter(c => c.stars === 3).length;
      const criteria: MasteryCriteria = {
        allLevelsCompleted: completed >= LEVELS_PER_WORLD,
        allLevelsPerfect: perfect >= LEVELS_PER_WORLD,
        // Quest/boss/flash data not available at map level — defaults to false
        allQuestsCompleted: false,
        bossHighHealth: false,
        flashChallengesMastered: false,
      };
      const tier = calculateMasteryTier(criteria);
      if (tier > 0) tiers[wId] = tier;
    }
    return tiers;
  }, [completions]);

  const { quests: dailyQuests } = useDailyQuests({
    initialProgress: progression?.dailyQuestProgress,
    lastQuestDate: progression?.dailyQuestDate,
  });

  const selectedWorldConfig = selectedWorld ? getWorldConfig(selectedWorld) : null;

  const gameGrid = selectedWorld && selectedLevel
    ? generateAdventureGrid(getGridSize(selectedWorld) as 4 | 5 | 6 | 7, getLevelSeed(selectedWorld, selectedLevel), language)
    : null;

  const levelConfig = selectedWorld && selectedLevel
    ? getLevelConfig(selectedWorld, selectedLevel, gameGrid ?? undefined)
    : null;

  const handleShopPurchase = useCallback((upgradeId: string, newState: UpgradeState, newGold: number) => {
    updateCurrency(upgradeId, newGold, newState);
  }, [updateCurrency]);

  const weeklyConfig = useMemo(() => getWeeklyChallengeConfig(), []);
  const weeklyLevelConfig = useMemo(() => ({
    world: 0, level: 1,
    gridSize: weeklyConfig.gridSize as 4 | 5 | 6 | 7,
    timerSeconds: weeklyConfig.timerSeconds,
    minWordLength: 3 as const,
    objectives: [{ type: 'scoreTarget' as const, target: 500, isPrimary: true }],
    specialTiles: [], difficulty: 'MEDIUM' as const,
    chapterNumber: 1 as const, levelInChapter: 1 as const, isBossLevel: false,
  }), [weeklyConfig]);

  const handlePlayWeeklyChallenge = useCallback(() => {
    setShowWeeklyChallenge(false);
    setViewState('weeklyChallenge');
  }, [setViewState]);

  const userId = progression?.userId;
  const handleWeeklyChallengeComplete = useCallback(async (
    _stars: number, score: number, wordsFound: number, _goldEarned: number
  ) => {
    try {
      await fetch('/api/adventure/weekly-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ score, wordsFound, longestWord: '', playerName: userId ? 'Player' : 'Guest' }),
      });
    } catch { /* Fire and forget */ }
    setViewState('hub');
    setShowWeeklyChallenge(true);
  }, [userId, setViewState]);

  const handleLevelComplete = useCallback(
    async (stars: number, score: number, wordsFound: number, goldEarned: number, longWords?: number) => {
      if (selectedWorld && selectedLevel) {
        try {
          await completeLevel(selectedWorld, selectedLevel, stars as 0 | 1 | 2 | 3, score, wordsFound, goldEarned, longWords);
        } catch (err) {
          console.warn('Failed to save progress:', err instanceof Error ? err.message : String(err));
        }
        if (typeof window !== 'undefined') {
          window.history.back();
        } else {
          setViewState('levelGrid');
          setSelectedLevel(null);
        }
      }
    },
    [selectedWorld, selectedLevel, completeLevel, setViewState, setSelectedLevel]
  );

  const handleGameExit = useCallback(() => {
    if (typeof window !== 'undefined') { window.history.back(); }
    else { setViewState('levelGrid'); setSelectedLevel(null); }
  }, [setViewState, setSelectedLevel]);

  if (isLoading) {
    return (
      <div className="h-screen bg-neo-navy flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-neo-yellow animate-spin" />
          <p className="text-neo-white font-bold">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-neo-navy flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className="w-16 h-16 bg-neo-red/20 rounded-full flex items-center justify-center">
            <span className="text-3xl">!</span>
          </div>
          <p className="text-neo-white font-bold">{t('adventure.loadError')}</p>
          <Link
            href="/"
            className={cn(
              'px-4 py-2 bg-neo-purple text-neo-white font-bold',
              'border-3 border-neo-black rounded-neo shadow-hard',
              'hover:bg-neo-purple-light transition-colors'
            )}
          >
            {t('common.back')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AdventureThemeProvider initialWorldId={selectedWorld || 1} initialLevel={selectedLevel || 1}>
    <div className="min-h-screen bg-neo-navy relative flex flex-col overflow-x-hidden">
      {(viewState === 'worldMap' || viewState === 'levelGrid') && (
        <AdventureViewHeader
          viewState={viewState}
          isRTL={isRTL}
          totalStars={totalStars}
          playerLevel={playerLevel}
          gold={gold}
          onBack={historyBack}
          onOpenShop={() => setShowShop(true)}
          t={t}
        />
      )}

      <AdventureViewModals
        showShop={showShop}
        showWordAlbum={showWordAlbum}
        showWeeklyChallenge={showWeeklyChallenge}
        isPlaying={viewState === 'playing'}
        gold={gold}
        upgrades={upgrades}
        selectedWorld={selectedWorld}
        wordAlbum={progression?.wordAlbum ?? []}
        wordAlbumClaimedMilestones={progression?.wordAlbumClaimedMilestones ?? []}
        onCloseShop={() => setShowShop(false)}
        onCloseWordAlbum={() => setShowWordAlbum(false)}
        onCloseWeeklyChallenge={() => setShowWeeklyChallenge(false)}
        onPlayWeeklyChallenge={handlePlayWeeklyChallenge}
        onShopPurchase={handleShopPurchase}
        t={t}
      />

      {(viewState === 'worldMap' || viewState === 'levelGrid') && <div className="h-14 flex-shrink-0" />}

      <div className="relative z-10 flex-1 min-h-0">
        <AnimatePresence mode="wait">
          {viewState === 'hub' && (
            <motion.div key="hub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="h-full">
              <AdventureHub
                streakDays={streakDays}
                bestStreak={bestStreak}
                dailyQuests={dailyQuests}
                totalStars={totalStars}
                playerLevel={playerLevel}
                gold={gold}
                completions={completions}
                currentWorld={progression?.currentWorld ?? 1}
                onOpenWorldMap={openWorldMapFromHub}
                onPlayLevel={selectLevel}
                onOpenShop={() => setShowShop(true)}
                wordAlbumCount={progression?.wordAlbum?.length ?? 0}
                onWeeklyChallenge={() => setShowWeeklyChallenge(true)}
                onBossRush={() => router.push(`/${language}/adventure/boss-rush`)}
                hasBossDefeat={hasBossDefeat}
              />
            </motion.div>
          )}

          {viewState === 'worldMap' && (
            <motion.div key="world-map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: isRTL ? 100 : -100 }} transition={{ duration: 0.3 }} className="h-full">
              <WorldMap totalStars={totalStars} completions={completions} onWorldSelect={selectWorld} masteryTiers={masteryTiers} />
            </motion.div>
          )}

          {viewState === 'levelGrid' && selectedWorldConfig && (
            <motion.div key="level-grid" initial={{ opacity: 0, x: isRTL ? -100 : 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="h-full">
              <LevelGrid world={selectedWorldConfig} completions={completions} totalStars={totalStars} onLevelSelect={selectLevel} />
            </motion.div>
          )}

          {viewState === 'playing' && levelConfig && gameGrid && (
            <motion.div key="playing" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} className="h-full">
              <AdventureGame levelConfig={levelConfig} initialGrid={gameGrid} onLevelComplete={handleLevelComplete} onExit={handleGameExit} onTimerStateChange={handleTimerStateChange} totalStars={totalStars} onNextWorld={navigateToWorldMap} />
            </motion.div>
          )}

          {viewState === 'weeklyChallenge' && (
            <motion.div key="weekly" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} className="h-full">
              <AdventureGame levelConfig={weeklyLevelConfig} initialGrid={weeklyConfig.grid} onLevelComplete={handleWeeklyChallengeComplete} onExit={() => setViewState('hub')} onTimerStateChange={handleTimerStateChange} totalStars={totalStars} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {(viewState === 'worldMap' || viewState === 'levelGrid') && (
        <AdventureShopFAB isRTL={isRTL} gold={gold} onOpenShop={() => setShowShop(true)} t={t} />
      )}
    </div>
    </AdventureThemeProvider>
  );
}

export default function AdventureViewWithErrorBoundary(): React.JSX.Element {
  return (
    <FeatureErrorBoundary featureName="Adventure Mode" showHomeButton={true}>
      <AdventureView />
    </FeatureErrorBoundary>
  );
}
