'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Star, Sparkles, Trophy, Map, Zap } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  WORLDS_COUNT,
  LEVELS_PER_WORLD,
  MAX_STARS_PER_LEVEL,
  getWorldConfig,
} from '@/lib/adventure';
import WorldMap from './WorldMap';
import LevelGrid from './LevelGrid';

/**
 * AdventureView - Main Adventure Mode with interactive floating islands world map
 * Shows all 10 worlds with visual progression and level selection
 */
export default function AdventureView(): React.JSX.Element {
  const { t, dir } = useLanguage();
  const isRTL = dir === 'rtl';

  // Mock player progress - in real implementation, this would come from user context/API
  const [playerProgress] = useState({
    totalStars: 25, // Example: player has 25 stars
    completions: [
      { world: 1, level: 1, stars: 3 },
      { world: 1, level: 2, stars: 2 },
      { world: 1, level: 3, stars: 3 },
      { world: 1, level: 4, stars: 2 },
      { world: 1, level: 5, stars: 3 },
      { world: 1, level: 6, stars: 2 },
      { world: 1, level: 7, stars: 2 },
      { world: 1, level: 8, stars: 3 },
      { world: 1, level: 9, stars: 2 },
      { world: 1, level: 10, stars: 3 },
      { world: 2, level: 1, stars: 2 },
      { world: 2, level: 2, stars: 2 },
    ],
    totalXp: 1250,
    playerLevel: 5,
  });

  // State for selected world (to show level grid)
  const [selectedWorld, setSelectedWorld] = useState<number | null>(null);

  // Calculate progress stats
  const maxPossibleStars = WORLDS_COUNT * LEVELS_PER_WORLD * MAX_STARS_PER_LEVEL;
  const completedLevels = playerProgress.completions.length;
  const totalLevels = WORLDS_COUNT * LEVELS_PER_WORLD;

  // Get selected world config
  const selectedWorldConfig = selectedWorld ? getWorldConfig(selectedWorld) : null;

  return (
    <div className="h-screen bg-neo-navy relative flex flex-col overflow-hidden">
      {/* Header - Fixed at top */}
      <header className="relative z-30 px-4 py-3 sm:px-6 lg:px-8 bg-neo-navy/90 backdrop-blur-sm border-b border-neo-white/10 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Back / World Map button */}
          {selectedWorld ? (
            <button
              onClick={() => setSelectedWorld(null)}
              className={cn(
                'flex items-center gap-2 px-4 py-2',
                'bg-neo-navy border-2 border-neo-white/20 rounded-neo',
                'text-neo-white font-bold hover:bg-neo-navy-light',
                'transition-colors shadow-hard-sm'
              )}
            >
              <ArrowLeft className={cn('w-5 h-5', isRTL && 'rotate-180')} />
              <span>{t('adventure.backToMap') || 'World Map'}</span>
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
                {playerProgress.totalStars}
              </span>
            </div>

            {/* Player Level */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neo-purple/20 border-2 border-neo-purple rounded-neo">
              <Zap className="w-4 h-4 text-neo-purple" />
              <span className="font-bold text-neo-purple text-sm">
                Lv.{playerProgress.playerLevel}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Takes remaining height */}
      <main className="relative z-10 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {selectedWorld === null ? (
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
                totalStars={playerProgress.totalStars}
                completions={playerProgress.completions}
                onWorldSelect={setSelectedWorld}
              />
            </motion.div>
          ) : (
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
                {selectedWorldConfig && (
                  <LevelGrid
                    world={selectedWorldConfig}
                    completions={playerProgress.completions}
                    totalStars={playerProgress.totalStars}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Development Notice - Only show on world map */}
        {selectedWorld === null && (
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
