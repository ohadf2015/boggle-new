'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Star, Sparkles, Trophy, Map, Zap, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProgression } from '@/contexts/ProgressionContext';
import { useMusic } from '@/contexts/MusicContext';
import { useAdventureMusic } from '@/hooks/useAdventureMusic';
import {
  getWorldConfig,
  getLevelConfig,
  generateAdventureGrid,
  getLevelSeed,
} from '@/lib/adventure';
import WorldMap from './WorldMap';
import LevelGrid from './LevelGrid';
import AdventureGame from './AdventureGame';
import WorldBackground from './themed/WorldBackground';
import { AdventureThemeProvider } from '@/contexts/AdventureThemeContext';
import MusicControls from '@/components/MusicControls';

// View state type for navigation
type ViewState = 'worldMap' | 'levelGrid' | 'playing';

// Timer state for music hook coordination
interface GameTimerState {
  timeRemaining: number;
  totalTime: number;
  isPlaying: boolean;
  isPaused: boolean;
}

/**
 * AdventureView - Main Adventure Mode with interactive floating islands world map
 * Shows all 10 worlds with visual progression and level selection
 */
export default function AdventureView(): React.JSX.Element {
  const { t, dir, language } = useLanguage();
  const isRTL = dir === 'rtl';

  // Get progression data from context
  const { progression, isLoading, error, completeLevel } = useProgression();

  // Global music context - stop main game music when adventure starts
  const { stopMusic: stopGlobalMusic } = useMusic();

  // View navigation state
  const [viewState, setViewState] = useState<ViewState>('worldMap');
  const [selectedWorld, setSelectedWorld] = useState<number | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  // Game timer state for music coordination (reported by AdventureGame)
  const [gameTimerState, setGameTimerState] = useState<GameTimerState>({
    timeRemaining: 0,
    totalTime: 0,
    isPlaying: false,
    isPaused: false,
  });

  // Stop global music when adventure mode starts
  useEffect(() => {
    stopGlobalMusic(500); // Quick fade out
  }, [stopGlobalMusic]);

  // Current world for music (selected world or default to 1)
  const currentMusicWorld = selectedWorld || 1;

  // Adventure music hook - plays on ALL adventure screens
  // - WorldMap/LevelGrid: ambient mode (track 1 loops, no timer tracking)
  // - AdventureGame: dynamic mode (track switching based on time)
  useAdventureMusic({
    worldNumber: currentMusicWorld,
    isPlaying: viewState === 'playing' ? gameTimerState.isPlaying : true,
    isPaused: viewState === 'playing' ? gameTimerState.isPaused : false,
    timeRemaining: viewState === 'playing' ? gameTimerState.timeRemaining : 0,
    totalTime: viewState === 'playing' ? gameTimerState.totalTime : 0,
    enabled: true,
  });

  // Callback for AdventureGame to report timer state
  const handleTimerStateChange = useCallback((timerState: GameTimerState) => {
    setGameTimerState(timerState);
  }, []);

  // Derive player stats from progression
  const totalStars = progression?.totalStars ?? 0;
  const playerLevel = progression?.playerLevel ?? 1;
  const completions = progression?.completions ?? [];

  // Get selected world config
  const selectedWorldConfig = selectedWorld ? getWorldConfig(selectedWorld) : null;

  // Get level config and grid for gameplay
  const levelConfig =
    selectedWorld && selectedLevel
      ? getLevelConfig(selectedWorld, selectedLevel)
      : null;

  const gameGrid =
    selectedWorld && selectedLevel && levelConfig
      ? generateAdventureGrid(
          levelConfig.gridSize as 4 | 5 | 6 | 7,
          getLevelSeed(selectedWorld, selectedLevel),
          language
        )
      : null;

  // Handle world selection from WorldMap
  const handleWorldSelect = useCallback((worldId: number) => {
    setSelectedWorld(worldId);
    setViewState('levelGrid');
  }, []);

  // Handle level selection from LevelGrid
  const handleLevelSelect = useCallback((worldId: number, levelId: number) => {
    setSelectedWorld(worldId);
    setSelectedLevel(levelId);
    setViewState('playing');
  }, []);

  // Handle game completion
  const handleLevelComplete = useCallback(
    async (stars: number, score: number) => {
      if (selectedWorld && selectedLevel) {
        try {
          await completeLevel(
            selectedWorld,
            selectedLevel,
            stars as 0 | 1 | 2 | 3,
            score,
            0 // words count - can be expanded later
          );
        } catch (err) {
          console.error('Failed to save progress:', err);
        }
        // Navigate back to level grid regardless of save success
        setViewState('levelGrid');
        setSelectedLevel(null);
      }
    },
    [selectedWorld, selectedLevel, completeLevel]
  );

  // Handle exit from game
  const handleGameExit = useCallback(() => {
    setViewState('levelGrid');
    setSelectedLevel(null);
  }, []);

  // Handle back navigation based on current view
  const handleBack = useCallback(() => {
    if (viewState === 'playing') {
      setViewState('levelGrid');
      setSelectedLevel(null);
    } else if (viewState === 'levelGrid') {
      setViewState('worldMap');
      setSelectedWorld(null);
    }
  }, [viewState]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen bg-neo-navy flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-neo-yellow animate-spin" />
          <p className="text-neo-white font-bold">
            {t('common.loading') || 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-screen bg-neo-navy flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className="w-16 h-16 bg-neo-red/20 rounded-full flex items-center justify-center">
            <span className="text-3xl">!</span>
          </div>
          <p className="text-neo-white font-bold">
            {t('adventure.loadError') || 'Failed to load progress'}
          </p>
          <Link
            href="/"
            className={cn(
              'px-4 py-2 bg-neo-purple text-neo-white font-bold',
              'border-3 border-neo-black rounded-neo shadow-hard',
              'hover:bg-neo-purple-light transition-colors'
            )}
          >
            {t('common.back') || 'Back'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AdventureThemeProvider
      initialWorldId={selectedWorld || 1}
      initialLevel={selectedLevel || 1}
    >
    <div className="h-screen bg-neo-navy relative flex flex-col overflow-hidden">
      {/* Header - Sticky at top */}
      <header className="sticky top-0 z-30 px-4 py-3 sm:px-6 lg:px-8 bg-neo-navy/90 backdrop-blur-sm border-b border-neo-white/10 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Back / World Map button */}
          {viewState !== 'worldMap' ? (
            <button
              onClick={handleBack}
              className={cn(
                'flex items-center gap-2 px-4 py-2',
                'bg-neo-navy border-2 border-neo-white/20 rounded-neo',
                'text-neo-white font-bold hover:bg-neo-navy-light',
                'transition-colors shadow-hard-sm'
              )}
            >
              <ArrowLeft className={cn('w-5 h-5', isRTL && 'rotate-180')} />
              <span>
                {viewState === 'playing'
                  ? t('adventure.exitToMap') || 'Exit to Map'
                  : t('adventure.backToMap') || 'World Map'}
              </span>
            </button>
          ) : (
            <Link
              href="/"
              className={cn(
                'flex items-center gap-2 px-4 py-2',
                'bg-neo-navy border-2 border-neo-white/20 rounded-neo',
                'text-neo-white font-bold hover:bg-neo-navy-light',
                'transition-colors shadow-hard-sm'
              )}
            >
              <ArrowLeft className={cn('w-5 h-5', isRTL && 'rotate-180')} />
              <span>{t('common.back') || 'Back'}</span>
            </Link>
          )}

          {/* Title */}
          <div className="hidden sm:flex items-center gap-2">
            <Map className="w-6 h-6 text-neo-lime" />
            <h1 className="text-xl font-black text-neo-white uppercase tracking-tight">
              {t('adventure.title') || 'Adventure'}
            </h1>
            <Sparkles className="w-6 h-6 text-neo-yellow" />
          </div>

          {/* Player Stats and Controls */}
          <div className="flex items-center gap-3">
            {/* Total Stars */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neo-yellow/20 border-2 border-neo-yellow rounded-neo">
              <Star className="w-4 h-4 text-neo-yellow fill-neo-yellow" />
              <span className="font-bold text-neo-yellow text-sm">
                {totalStars}
              </span>
            </div>

            {/* Player Level */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neo-purple/20 border-2 border-neo-purple rounded-neo">
              <Zap className="w-4 h-4 text-neo-purple" />
              <span className="font-bold text-neo-purple text-sm">
                Lv.{playerLevel}
              </span>
            </div>

            {/* Sound Controller */}
            <MusicControls />
          </div>
        </div>
      </header>

      {/* Main Content - Takes remaining height */}
      <main className="relative z-10 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {viewState === 'worldMap' && (
            // World Map View
            <motion.div
              key="world-map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: isRTL ? 100 : -100 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <WorldMap
                totalStars={totalStars}
                completions={completions}
                onWorldSelect={handleWorldSelect}
              />
            </motion.div>
          )}

          {viewState === 'levelGrid' && selectedWorldConfig && (
            // Level Grid View - with world-themed parallax background
            <motion.div
              key="level-grid"
              initial={{ opacity: 0, x: isRTL ? -100 : 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <WorldBackground className="h-full">
                <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 scrollbar-thin scrollbar-thumb-neo-white/20 scrollbar-track-transparent">
                  <div className="max-w-7xl mx-auto">
                    <LevelGrid
                      world={selectedWorldConfig}
                      completions={completions}
                      totalStars={totalStars}
                      onLevelSelect={handleLevelSelect}
                    />
                  </div>
                </div>
              </WorldBackground>
            </motion.div>
          )}

          {viewState === 'playing' && levelConfig && gameGrid && (
            // Game View
            <motion.div
              key="playing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <AdventureGame
                levelConfig={levelConfig}
                initialGrid={gameGrid}
                onLevelComplete={handleLevelComplete}
                onExit={handleGameExit}
                onTimerStateChange={handleTimerStateChange}
                totalStars={totalStars}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Development Notice - Only show on world map, positioned within content flow */}
        {viewState === 'worldMap' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="absolute bottom-4 left-4 right-4 pointer-events-none"
          >
            <div className="max-w-md mx-auto pointer-events-auto">
              <div
                className={cn(
                  'flex items-center gap-3 px-4 py-3',
                  'bg-neo-purple/90 border-3 border-neo-black rounded-neo-lg',
                  'shadow-hard backdrop-blur-sm'
                )}
              >
                <Trophy className="w-6 h-6 text-neo-yellow flex-shrink-0" />
                <div>
                  <p className="text-neo-white font-bold text-sm">
                    {t('adventure.devPreview') || 'Development Preview'}
                  </p>
                  <p className="text-neo-white/70 text-xs">
                    {t('adventure.devPreviewDesc') ||
                      'Adventure Mode is under development.'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
    </AdventureThemeProvider>
  );
}
