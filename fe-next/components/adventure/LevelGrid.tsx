'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Star, Lock, Clock, Target, Snowflake, Bomb, Rainbow, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  LEVELS_PER_WORLD,
  MAX_STARS_PER_LEVEL,
  isLevelUnlocked,
  getLevelConfig,
  getGridSize,
  getTimerDuration,
  getWorldColors,
  type WorldConfig,
} from '@/lib/adventure';

interface LevelGridProps {
  world: WorldConfig;
  completions: Array<{ world: number; level: number; stars: number }>;
  totalStars: number;
}

// Icon map for special tile types
const TILE_ICONS: Record<string, React.ReactNode> = {
  gold: <Coins className="w-3 h-3" />,
  ice: <Snowflake className="w-3 h-3" />,
  bomb: <Bomb className="w-3 h-3" />,
  rainbow: <Rainbow className="w-3 h-3" />,
};


/**
 * LevelGrid - Displays all levels for a selected world
 * Shows level cards with objectives, tiles, and completion status
 */
export default function LevelGrid({
  world,
  completions,
  totalStars,
}: LevelGridProps): React.JSX.Element {
  const { t } = useLanguage();

  // Generate levels for this world
  const levels = Array.from({ length: LEVELS_PER_WORLD }, (_, i) => {
    const levelNum = i + 1;
    const config = getLevelConfig(world.id, levelNum);
    const completion = completions.find(
      (c) => c.world === world.id && c.level === levelNum
    );
    const isUnlocked = isLevelUnlocked(world.id, levelNum, completions);
    const stars = completion?.stars || 0;

    return {
      levelNum,
      config,
      completion,
      isUnlocked,
      stars,
    };
  });

  // World name translation
  const worldName = t(`adventure.worlds.${world.name}`) || world.name;
  const worldStars = completions
    .filter((c) => c.world === world.id)
    .reduce((sum, c) => sum + c.stars, 0);
  const maxWorldStars = LEVELS_PER_WORLD * MAX_STARS_PER_LEVEL;

  // Get world-specific colors for consistent theming
  const worldColors = getWorldColors(world.colorPrimary);

  return (
    <div className="space-y-6">
      {/* World Header with themed accent */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'p-4 sm:p-6 rounded-neo-lg border-3 border-neo-black',
          worldColors.bg,
          worldColors.glow
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-neo-white uppercase tracking-tight">
              {t('adventure.worldLabel') || 'World'} {world.id}: {worldName}
            </h2>
            {world.mechanic && (
              <p className="text-neo-white/70 mt-1">
                <span className={cn('font-bold', worldColors.text)}>
                  {t(`adventure.mechanics.${world.mechanic}`) || world.mechanic}
                </span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            {/* World Stars - uses world theme color */}
            <div className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-neo border-2',
              worldColors.bg,
              worldColors.border
            )}>
              <Star className={cn('w-5 h-5 fill-current', worldColors.text)} />
              <span className={cn('font-bold', worldColors.text)}>
                {worldStars}/{maxWorldStars}
              </span>
            </div>

            {/* Grid Size */}
            <div className="flex items-center gap-2 px-3 py-2 bg-neo-white/10 border-2 border-neo-white/30 rounded-neo">
              <Target className="w-5 h-5 text-neo-white/70" />
              <span className="font-bold text-neo-white/70">
                {getGridSize(world.id)}x{getGridSize(world.id)}
              </span>
            </div>

            {/* Timer */}
            <div className="flex items-center gap-2 px-3 py-2 bg-neo-white/10 border-2 border-neo-white/30 rounded-neo">
              <Clock className="w-5 h-5 text-neo-white/70" />
              <span className="font-bold text-neo-white/70">
                {getTimerDuration(world.id)}s
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Level Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {levels.map(({ levelNum, config, isUnlocked, stars }) => (
          <motion.button
            key={levelNum}
            disabled={!isUnlocked}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: levelNum * 0.03 }}
            whileHover={isUnlocked ? { scale: 1.05 } : undefined}
            whileTap={isUnlocked ? { scale: 0.95 } : undefined}
            className={cn(
              'relative p-4 rounded-neo border-3 transition-all duration-200',
              isUnlocked
                ? cn(
                    'bg-neo-navy-light border-neo-white/30',
                    'shadow-hard hover:shadow-hard-lg cursor-pointer',
                    // Use world theme color for hover and completed states
                    stars > 0 ? worldColors.border : `hover:${worldColors.border}`
                  )
                : 'bg-neo-navy border-neo-white/10 cursor-not-allowed opacity-50'
            )}
            style={isUnlocked && stars === 0 ? {
              // Apply hover border color dynamically
              ['--hover-border' as string]: world.colorPrimary,
            } : undefined}
          >
            {/* Level Number */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl font-black text-neo-white">{levelNum}</span>
              {!isUnlocked && <Lock className="w-5 h-5 text-neo-white/40" />}
            </div>

            {/* Stars */}
            <div className="flex items-center gap-1 mb-3">
              {Array.from({ length: MAX_STARS_PER_LEVEL }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    'w-5 h-5 transition-colors',
                    i < stars
                      ? 'text-neo-yellow fill-neo-yellow'
                      : 'text-neo-white/20'
                  )}
                />
              ))}
            </div>

            {/* Level Info */}
            {isUnlocked && (
              <div className="space-y-2">
                {/* Primary Objective */}
                {config.objectives
                  .filter((o) => o.isPrimary)
                  .map((obj, i) => (
                    <div
                      key={i}
                      className="text-xs text-neo-white/70 flex items-center gap-1"
                    >
                      <Target className="w-3 h-3" />
                      <span>
                        {t(`adventure.objectives.${obj.type}`) || obj.type}: {obj.target}
                      </span>
                    </div>
                  ))}

                {/* Special Tiles */}
                {config.specialTiles.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {Object.entries(
                      config.specialTiles.reduce((acc, tile) => {
                        acc[tile.type] = (acc[tile.type] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                    ).map(([type, count]) => (
                      <span
                        key={type}
                        className={cn(
                          'inline-flex items-center gap-0.5 px-1.5 py-0.5',
                          'text-[10px] font-bold rounded-sm',
                          type === 'gold' && 'bg-neo-yellow/20 text-neo-yellow',
                          type === 'ice' && 'bg-neo-cyan/20 text-neo-cyan',
                          type === 'bomb' && 'bg-neo-red/20 text-neo-red',
                          type === 'rainbow' && 'bg-neo-pink/20 text-neo-pink'
                        )}
                      >
                        {TILE_ICONS[type]}
                        <span>{count}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Hidden Word Indicator */}
                {config.hiddenWord && (
                  <div className="text-xs text-neo-purple font-bold">
                    {t('adventure.hiddenWord') || 'Hidden Word'}
                  </div>
                )}
              </div>
            )}

            {/* Difficulty Badge */}
            <div
              className={cn(
                'absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded',
                config.difficulty === 'EASY' && 'bg-neo-lime/20 text-neo-lime',
                config.difficulty === 'MEDIUM' && 'bg-neo-orange/20 text-neo-orange',
                config.difficulty === 'HARD' && 'bg-neo-red/20 text-neo-red'
              )}
            >
              {config.difficulty}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
