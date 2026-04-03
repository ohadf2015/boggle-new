'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Loader2, Sparkles, X } from 'lucide-react';
import { FeatureErrorBoundary } from '@/components/ErrorBoundaries';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useProgression } from '@/contexts/ProgressionContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMusic } from '@/contexts/MusicContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import type { UpgradeState } from '@/lib/adventure/upgradeConfig';
import { useAdventureMusic } from '@/hooks/useAdventureMusic';
import { getWeeklyChallengeConfig } from '@/lib/adventure/weeklyChallenge';
import {
  getWorldConfig,
  getLevelConfig,
  generateAdventureGrid,
  getLevelSeed,
  getGridSize,
} from '@/lib/adventure';
import dynamic from 'next/dynamic';
import { AdventureThemeProvider } from '@/contexts/AdventureThemeContext';

import { calculateWorldMastery, convertQuestProgressWithTargets, deriveBossHighHealth } from '@/lib/adventure/mastery';
import type { MasteryTier } from '@/types/adventure';
import AdventureViewHeader from './AdventureViewHeader';
import AdventureViewModals from './AdventureViewModals';
import AdventureShopFAB from './AdventureShopFAB';
import WorldMap from './WorldMap';
import LevelGrid from './LevelGrid';
import { useAdventureHistory } from './useAdventureHistory';
import { AdventureGameErrorBoundary } from './AdventureGameErrorBoundary';
import { useBossRush } from './hooks/useBossRush';
import BossRushResults from './BossRushResults';

const AdventureGame = dynamic(() => import('./AdventureGame'), { ssr: false, loading: () => <div className="h-screen bg-neo-navy flex items-center justify-center"><Loader2 className="w-12 h-12 text-neo-yellow animate-spin" /></div> });
const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });


function AdventureView(): React.JSX.Element {
  const { t, dir, language } = useLanguageSafe();
  const isRTL = dir === 'rtl';
  const { progression, isLoading, error, isAuthError, completeLevel, updateCurrency, refreshProgression } = useProgression();
  const { user } = useAuth();
  const isGuest = !user?.id;

  const gold = progression?.gold ?? 0;
  const upgrades = (progression?.upgrades ?? {}) as Record<string, number>;

  const [showShop, setShowShop] = useState(false);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [showWordAlbum, setShowWordAlbum] = useState(false);
  const [showWeeklyChallenge, setShowWeeklyChallenge] = useState(false);

  // Stable callbacks for modal toggles — prevents child re-renders via memo
  const openShop = useCallback(() => setShowShop(true), []);
  const closeShop = useCallback(() => setShowShop(false), []);
  const closeWeeklyChallenge = useCallback(() => setShowWeeklyChallenge(false), []);
  const closeWordAlbum = useCallback(() => setShowWordAlbum(false), []);
  const { stopMusic: stopGlobalMusic } = useMusic();
  const setIsInGame = useHideNavigation();

  const hasCompletions = (progression?.completions?.length ?? 0) > 0;
  const {
    viewState, setViewState,
    selectedWorld, selectedLevel, setSelectedLevel,
    navigateToWorldMap, selectWorld, selectLevel,
    historyBack,
  } = useAdventureHistory('worldMap', null);

  useEffect(() => { stopGlobalMusic(500); }, [stopGlobalMusic]);

  // Hide main header during active gameplay
  useEffect(() => {
    const playing = viewState === 'playing' || viewState === 'bossRush';
    setIsInGame(playing);
    return () => setIsInGame(false);
  }, [viewState, setIsInGame]);

  // Ambient music for hub/map/levelGrid screens.
  // During gameplay, this hook is disabled (enabled:false) so that timer ticks
  // inside AdventureGame do NOT cause AdventureView to re-render.
  // AdventureGame handles in-game music internally.
  const isInGameplay = viewState === 'playing' || viewState === 'bossRush' || viewState === 'weeklyChallenge';
  const currentMusicWorld = selectedWorld || 1;
  useAdventureMusic({
    worldNumber: currentMusicWorld,
    isPlaying: true,
    isPaused: false,
    timeRemaining: 0,
    totalTime: 0,
    enabled: !isInGameplay,
  });

  const playerLevel = progression?.playerLevel ?? 1;
  const completions = useMemo(() => progression?.completions ?? [], [progression?.completions]);
  // Derive totalStars from completions (source of truth) instead of
  // progression.totalStars which can be stale after level completion.
  // This ensures the modal and level cards always show consistent star counts.
  const totalStars = useMemo(
    () => completions.reduce((sum, c) => sum + c.stars, 0),
    [completions]
  );

  const questProgressMap = progression?.chapterQuestProgress;
  const masteryTiers = useMemo(() => {
    const tiers: Record<number, MasteryTier> = {};
    for (let worldId = 1; worldId <= 10; worldId++) {
      const questProgress = convertQuestProgressWithTargets(worldId, questProgressMap);
      const bossHighHealth = deriveBossHighHealth(worldId, completions);
      const mastery = calculateWorldMastery(worldId, completions, questProgress, bossHighHealth, 0);
      tiers[worldId] = mastery.tier;
    }
    return tiers;
  }, [completions, questProgressMap]);

  // Boss Rush
  const bossRush = useBossRush(completions);

  const handleBossRushBossDefeated = useCallback((_stars: number, score: number) => {
    bossRush.addScore(score);
    bossRush.advanceToNextBoss();
  }, [bossRush]);

  const handleBossRushFailed = useCallback(() => {
    bossRush.failRush();
  }, [bossRush]);

  const handleBossRushRetry = useCallback(() => {
    bossRush.resetRush();
    bossRush.startRush();
    setViewState('bossRush');
  }, [bossRush, setViewState]);

  const handleBossRushExit = useCallback(() => {
    bossRush.resetRush();
    setViewState('worldMap');
  }, [bossRush, setViewState]);

  const selectedWorldConfig = selectedWorld ? getWorldConfig(selectedWorld) : null;

  const gameGrid = useMemo(
    () => selectedWorld && selectedLevel
      ? generateAdventureGrid(getGridSize(selectedWorld) as 4 | 5 | 6 | 7, getLevelSeed(selectedWorld, selectedLevel), language)
      : null,
    [selectedWorld, selectedLevel, language]
  );

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
    _stars: number, score: number, wordsFound: number, _goldEarned: number, _longWords?: number, wordList?: string[]
  ) => {
    // Find the longest word from the game session
    const longestWord = wordList?.reduce((a, b) => b.length > a.length ? b : a, '') ?? '';
    await fetch('/api/adventure/weekly-challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ score, wordsFound, longestWord, playerName: userId ? 'Player' : 'Guest' }),
    }).catch(() => { /* Fire and forget */ });
    setViewState('worldMap');
    setShowWeeklyChallenge(true);
  }, [userId, setViewState]);

  const handleLevelComplete = useCallback(
    async (stars: number, score: number, wordsFound: number, goldEarned: number, longWords?: number) => {
      // The eager save in useAdventureLevelCompletion fires as soon as the level ends.
      // This callback is a fallback — if the eager save failed or hasn't fired yet, retry here.
      if (selectedWorld && selectedLevel && stars > 0) {
        // completeLevel's in-flight guard prevents duplicate API calls for the same level,
        // so this is safe to call even if the eager save already succeeded.
        const saved = await completeLevel(selectedWorld, selectedLevel, stars as 0 | 1 | 2 | 3, score, wordsFound, goldEarned, longWords) as boolean | void;
        if (saved === false) {
          if (isGuest) {
            setShowSignupPrompt(true);
          } else {
            toast.error(t('adventure.progressNotSaved'));
          }
        }
      }
      if (typeof window !== 'undefined') {
        window.history.back();
      } else {
        setViewState('levelGrid');
        setSelectedLevel(null);
      }
    },
    [selectedWorld, selectedLevel, completeLevel, setViewState, setSelectedLevel, t, isGuest]
  );

  const handleGameExit = useCallback(() => {
    if (typeof window !== 'undefined') { window.history.back(); }
    else { setViewState('levelGrid'); setSelectedLevel(null); }
  }, [setViewState, setSelectedLevel]);

  // Only show full-screen spinner when there's no cached progression at all.
  // When cached data exists, render the UI immediately with stale data —
  // the API fetch will merge fresh data in the background.
  if (isLoading && !progression) {
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
    const handleReLogin = () => {
      // Clear stale auth cookies and redirect to login
      window.location.href = `/${language || 'en'}?login=true`;
    };

    return (
      <div className="h-screen bg-neo-navy flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center',
            isAuthError ? 'bg-neo-yellow/20' : 'bg-neo-red/20'
          )}>
            <span className="text-3xl">{isAuthError ? '🔑' : '!'}</span>
          </div>
          <p className="text-neo-white font-bold">
            {isAuthError ? t('adventure.sessionExpired') : t('adventure.loadError')}
          </p>
          {process.env.NODE_ENV === 'development' && error && !isAuthError && (
            <p className="text-neo-white/40 text-xs max-w-xs font-mono break-all">
              {error.message}
            </p>
          )}
          {isAuthError && (
            <p className="text-neo-white/60 text-sm max-w-xs">
              {t('adventure.sessionExpiredHint')}
            </p>
          )}
          <div className="flex gap-3">
            {isAuthError ? (
              <button
                onClick={handleReLogin}
                className={cn(
                  'px-4 py-2 bg-neo-lime text-neo-black font-bold',
                  'border-3 border-neo-black rounded-neo shadow-hard',
                  'hover:shadow-hard-pressed active:translate-y-0.5 transition-all'
                )}
              >
                {t('adventure.loginAgain')}
              </button>
            ) : (
              <button
                onClick={() => refreshProgression()}
                className={cn(
                  'px-4 py-2 bg-neo-lime text-neo-black font-bold',
                  'border-3 border-neo-black rounded-neo shadow-hard',
                  'hover:shadow-hard-pressed active:translate-y-0.5 transition-all'
                )}
              >
                {t('common.retry')}
              </button>
            )}
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
      </div>
    );
  }

  return (
    <AdventureThemeProvider initialWorldId={selectedWorld || 1} initialLevel={selectedLevel || 1}>
    <div className="h-screen bg-neo-navy relative flex flex-col overflow-x-hidden">
      {(viewState === 'worldMap' || viewState === 'levelGrid') && (
        <AdventureViewHeader
          viewState={viewState}
          totalStars={totalStars}
          playerLevel={playerLevel}
          onBack={historyBack}
          t={t}
          worldName={selectedWorldConfig ? t(`adventure.worlds.${selectedWorldConfig.name}`) : undefined}
          hasHub={hasCompletions}
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
        onCloseShop={closeShop}
        onCloseWordAlbum={closeWordAlbum}
        onCloseWeeklyChallenge={closeWeeklyChallenge}
        onPlayWeeklyChallenge={handlePlayWeeklyChallenge}
        onShopPurchase={handleShopPurchase}
        t={t}
      />

      {(viewState === 'worldMap' || viewState === 'levelGrid') && <div className="h-14 flex-shrink-0" />}

      <div className="relative z-10 flex-1 min-h-0">
        <AdaptiveAnimatePresence mode="wait">
          {viewState === 'worldMap' && (
            <AdaptiveMotion.div key="world-map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: isRTL ? 100 : -100 }} transition={{ duration: 0.3 }} className="h-full relative">
              <WorldMap totalStars={totalStars} completions={completions} onWorldSelect={selectWorld} masteryTiers={masteryTiers} onContinue={selectLevel} welcomeBanner={!hasCompletions ? <AdventureWelcomeBanner t={t} onSelectWorld={() => selectWorld(1)} /> : undefined} />
            </AdaptiveMotion.div>
          )}

          {viewState === 'levelGrid' && selectedWorldConfig && (
            <AdaptiveMotion.div key="level-grid" initial={{ opacity: 0, x: isRTL ? -100 : 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="h-full">
              <LevelGrid world={selectedWorldConfig} completions={completions} totalStars={totalStars} onLevelSelect={selectLevel} />
            </AdaptiveMotion.div>
          )}

          {viewState === 'playing' && levelConfig && gameGrid && (
            <AdaptiveMotion.div key="playing" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} className="h-full">
              <AdventureGameErrorBoundary onExit={handleGameExit}>
                <AdventureGame levelConfig={levelConfig} initialGrid={gameGrid} onLevelComplete={handleLevelComplete} onExit={handleGameExit} totalStars={totalStars} onNextWorld={navigateToWorldMap} />
              </AdventureGameErrorBoundary>
            </AdaptiveMotion.div>
          )}

          {viewState === 'weeklyChallenge' && (
            <AdaptiveMotion.div key="weekly" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} className="h-full">
              <AdventureGameErrorBoundary onExit={() => setViewState('worldMap')}>
                <AdventureGame levelConfig={weeklyLevelConfig} initialGrid={weeklyConfig.grid} onLevelComplete={handleWeeklyChallengeComplete} onExit={() => setViewState('worldMap')} totalStars={totalStars} />
              </AdventureGameErrorBoundary>
            </AdaptiveMotion.div>
          )}

          {viewState === 'bossRush' && (() => {
            const rushConfig = bossRush.getLevelConfigForCurrentBoss();
            const rushWorldId = bossRush.getCurrentBossWorldId();
            const rushGrid = rushWorldId
              ? generateAdventureGrid(getGridSize(rushWorldId) as 4 | 5 | 6 | 7, getLevelSeed(rushWorldId, 7), language)
              : null;

            // Show results if rush is complete or failed
            if (bossRush.state.isComplete || bossRush.state.isFailed) {
              return (
                <AdaptiveMotion.div key="boss-rush-results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="h-full">
                  <BossRushResults state={bossRush.state} onRetry={handleBossRushRetry} onExit={handleBossRushExit} />
                </AdaptiveMotion.div>
              );
            }

            // Active boss fight
            if (rushConfig && rushGrid) {
              return (
                <AdaptiveMotion.div key={`boss-rush-${bossRush.state.currentBossIndex}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} className="h-full">
                  <AdventureGameErrorBoundary onExit={handleBossRushExit}>
                    <AdventureGame levelConfig={rushConfig} initialGrid={rushGrid} onLevelComplete={handleBossRushBossDefeated} onExit={handleBossRushFailed} totalStars={totalStars} />
                  </AdventureGameErrorBoundary>
                </AdaptiveMotion.div>
              );
            }

            return null;
          })()}
        </AdaptiveAnimatePresence>
      </div>

      {(viewState === 'worldMap' || viewState === 'levelGrid') && (
        <AdventureShopFAB isRTL={isRTL} gold={gold} onOpenShop={openShop} t={t} />
      )}

      <AuthModal
        isOpen={showSignupPrompt}
        onClose={() => setShowSignupPrompt(false)}
        initialMode="signup"
        showGuestStats
      />
    </div>
    </AdventureThemeProvider>
  );
}

// ==================== First-Time Welcome Banner ====================

function AdventureWelcomeBanner({ t, onSelectWorld }: { t: (key: string) => string; onSelectWorld: () => void }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <AdaptiveMotion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="relative bg-gradient-to-r from-neo-purple to-neo-pink border-3 border-neo-black rounded-neo-lg shadow-hard-lg p-4"
    >
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 end-2 p-1 text-neo-white/60 hover:text-neo-white"
        aria-label={t('common.close')}
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3">
        <Sparkles className="w-6 h-6 text-neo-yellow flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-neo-display font-bold text-neo-white text-sm uppercase">
            {t('adventure.welcome.title')}
          </h3>
          <p className="text-xs text-neo-white/80 mt-1 font-medium">
            {t('adventure.welcome.description')}
          </p>
          <button
            onClick={onSelectWorld}
            className="mt-2.5 px-4 py-2 bg-neo-lime text-neo-black font-bold text-xs uppercase rounded-neo border-2 border-neo-black shadow-hard-sm active:shadow-hard-pressed active:translate-y-0.5 transition-all"
          >
            {t('adventure.welcome.startButton')}
          </button>
        </div>
      </div>
    </AdaptiveMotion.div>
  );
}

export default function AdventureViewWithErrorBoundary(): React.JSX.Element {
  return (
    <FeatureErrorBoundary featureName="Adventure Mode" showHomeButton={true}>
      <AdventureView />
    </FeatureErrorBoundary>
  );
}
