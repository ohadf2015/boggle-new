/**
 * GameHeader Component
 *
 * Organized header bar with level info, score, and timer.
 * Clean visual hierarchy with distinct sections.
 */

'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Pause, Play, LogOut, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import AdventureTimer from '../AdventureTimer';
import { RollingNumber } from './RollingNumber';

// ==============================================
// TYPES
// ==============================================

interface GameHeaderProps {
  worldNumber: number;
  levelNumber: number;
  score: number;
  timeRemaining: number;
  isPaused: boolean;
  onPauseToggle: () => void;
  onExit: () => void;
  className?: string;
}

// ==============================================
// COMPONENT
// ==============================================

export const GameHeader = memo(function GameHeader({
  worldNumber,
  levelNumber,
  score,
  timeRemaining,
  isPaused,
  onPauseToggle,
  onExit,
  className,
}: GameHeaderProps) {
  const { t } = useLanguage();

  return (
    <header
      className={cn(
        'flex items-center justify-between',
        'px-3 sm:px-4 py-2 sm:py-3',
        'bg-neo-navy/90 backdrop-blur-md',
        'border-b-3 border-neo-black/40',
        'flex-shrink-0',
        'shadow-hard-sm',
        className
      )}
    >
      {/* Left: Level Info */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Level Badge */}
        <motion.div 
          className={cn(
            'flex items-center gap-1.5 sm:gap-2',
            'px-2 sm:px-3 py-1 sm:py-1.5',
            'bg-neo-black/40 rounded-neo',
            'border-2 border-neo-white/10'
          )}
          whileHover={{ scale: 1.02 }}
        >
          <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-neo-cyan" />
          <div className="flex items-baseline gap-1">
            <span className="text-xs text-neo-white/60 hidden sm:inline">{t('adventure.world')}</span>
            <span className="text-xs text-neo-white/60 sm:hidden">W</span>
            <span className="font-black text-neo-white">{worldNumber}</span>
            <span className="text-neo-white/30">/</span>
            <span className="text-xs text-neo-white/60 hidden sm:inline">{t('adventure.level')}</span>
            <span className="text-xs text-neo-white/60 sm:hidden">L</span>
            <span className="font-black text-neo-cyan">{levelNumber}</span>
          </div>
        </motion.div>

        {/* Score Display */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs text-neo-white/50 uppercase tracking-wide">
            {t('common.score')}
          </span>
          <RollingNumber 
            value={score}
            variant="white"
            className="text-lg font-black"
          />
        </div>
      </div>

      {/* Right: Timer & Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Score - Compact */}
        <div className="flex sm:hidden items-center gap-1 px-2 py-1 bg-neo-black/30 rounded-neo">
          <RollingNumber 
            value={score}
            variant="white"
            className="text-sm font-black"
          />
        </div>

        {/* Timer */}
        <AdventureTimer 
          timeRemaining={timeRemaining}
          size="compact"
        />

        {/* Control Buttons */}
        <div className="flex items-center gap-1">
          {/* Pause/Resume */}
          <motion.button
            onClick={onPauseToggle}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'p-1.5 sm:p-2 rounded-neo',
              'transition-colors duration-200',
              isPaused 
                ? 'bg-neo-lime text-neo-black' 
                : 'bg-neo-white/10 text-neo-white hover:bg-neo-white/20'
            )}
            aria-label={isPaused ? t('common.resume') : t('common.pause')}
          >
            {isPaused ? (
              <Play className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </motion.button>

          {/* Exit */}
          <motion.button
            onClick={onExit}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'p-1.5 sm:p-2 rounded-neo',
              'bg-neo-white/5 text-neo-white/60',
              'hover:bg-neo-red/20 hover:text-neo-red',
              'transition-colors duration-200'
            )}
            aria-label={t('common.exit')}
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </motion.button>
        </div>
      </div>
    </header>
  );
});

GameHeader.displayName = 'GameHeader';

export default GameHeader;
