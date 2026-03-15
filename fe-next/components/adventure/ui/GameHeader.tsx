/**
 * GameHeader Component
 *
 * Organized header bar with level info, score, and timer.
 * Clean visual hierarchy with distinct sections.
 * Colors driven by useHUDTheme() for per-world theming.
 */

'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Pause, Play, LogOut, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHUDTheme } from '@/contexts/AdventureThemeContext';
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
  const hudTheme = useHUDTheme();

  return (
    <header
      className={cn(
        'flex items-center justify-between relative',
        'px-3 py-2',
        hudTheme.headerBg, 'backdrop-blur-md',
        'border-b-3', hudTheme.headerBorder,
        'flex-shrink-0',
        'shadow-hard-sm',
        className
      )}
    >
      {/* Left: Level Badge — compact, always abbreviated */}
      <motion.div
        className={cn(
          'flex items-center gap-1.5',
          'px-2 py-1',
          hudTheme.levelBadgeColor, 'rounded-neo',
          'border-2 border-neo-white/20',
          'shadow-hard-sm'
        )}
        whileHover={{ scale: 1.02 }}
        aria-label={`${t('adventure.world')} ${worldNumber}, ${t('adventure.level')} ${levelNumber}`}
      >
        <MapPin className={cn('w-3.5 h-3.5', hudTheme.levelBadgeText)} />
        <span className="text-[11px] font-mono font-black text-neo-white tabular-nums">
          W{worldNumber} · L{levelNumber}
        </span>
      </motion.div>

      {/* Center: Score — single display, always visible, absolutely centered */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center"
        aria-live="polite"
        aria-atomic="true"
        data-testid="score-display"
      >
        <span className="text-[9px] font-mono text-neo-white/40 uppercase tracking-widest leading-none">
          {t('common.score')}
        </span>
        <RollingNumber
          value={score}
          variant="white"
          className="text-lg sm:text-xl font-black leading-tight tabular-nums"
        />
      </div>

      {/* Right: Timer & Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Timer — most important game state indicator, visually prominent */}
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
              'p-2 rounded-neo',
              'min-w-[44px] min-h-[44px] flex items-center justify-center',
              'transition-colors duration-200',
              isPaused
                ? 'bg-neo-lime text-neo-black shadow-hard-sm'
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
              'p-2 rounded-neo',
              'min-w-[44px] min-h-[44px] flex items-center justify-center',
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
