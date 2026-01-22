'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Star, Sparkles, Trophy, Map, Zap, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProgression } from '@/contexts/ProgressionContext';
import {
  getWorldConfig,
  getLevelConfig,
  generateAdventureGrid,
  getLevelSeed,
} from '@/lib/adventure';
import WorldMap from './WorldMap';
import LevelGrid from './LevelGrid';
import AdventureGame from './AdventureGame';

// View state type for navigation
type ViewState = 'worldMap' | 'levelGrid' | 'playing';

/**
 * AdventureView - Main Adventure Mode with interactive floating islands world map
 * Shows all 10 worlds with visual progression and level selection
 */
export default function AdventureView(): React.JSX.Element {
  const { t, dir } = useLanguage();
  const isRTL = dir === 'rtl';

  // Get progression data from context
  const { progression, isLoading, error, completeLevel } = useProgression();

  // View navigation state
  const [viewState, setViewState] = useState<ViewState>('worldMap');
  const [selectedWorld, setSelectedWorld] = useState<number | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

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
          getLevelSeed(selectedWorld, selectedLevel)
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
    <div className="h-screen bg-neo-navy relative flex flex-col overflow-hidden">
      {/* Header - Fixed at top */}
      <header className="relative z-30 px-4 py-3 sm:px-6 lg:px-8 bg-neo-navy/90 backdrop-blur-sm border-b border-neo-white/10 flex-shrink-0">
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

          {/* Player Stats */}
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
            // Level Grid View
            <motion.div
              key="level-grid"
              initial={{ opacity: 0, x: isRTL ? -100 : 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="px-4 py-6 sm:px-6 lg:px-8 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-neo-white/20 scrollbar-track-transparent"
            >
              <div className="max-w-7xl mx-auto">
                <LevelGrid
                  world={selectedWorldConfig}
                  completions={completions}
                  totalStars={totalStars}
                  onLevelSelect={handleLevelSelect}
                />
              </div>
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
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Development Notice - Only show on world map */}
        {viewState === 'worldMap' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="fixed bottom-4 left-4 right-4 z-20"
          >
            <div className="max-w-md mx-auto">
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
  );
}
