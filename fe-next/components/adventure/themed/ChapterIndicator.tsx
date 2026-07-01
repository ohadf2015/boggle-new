/**
 * ChapterIndicator Component
 *
 * Displays the current chapter and level progress within a world.
 * Shows chapter name, level position, and boss level indicator.
 */

'use client';

import { memo } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Crown, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAdventureTheme, useCurrentChapter } from '@/contexts/AdventureThemeContext';

// ==============================================
// TYPES
// ==============================================

interface ChapterIndicatorProps {
  /** Whether to show the full chapter name or just progress */
  showFullName?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ==============================================
// SUB-COMPONENTS
// ==============================================

interface LevelDotsProps {
  totalLevels: number;
  currentPosition: number;
  accentColor: string;
  isBossChapter: boolean;
}

const LevelDots = memo<LevelDotsProps>(({
  totalLevels,
  currentPosition,
  accentColor,
  isBossChapter,
}) => {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: totalLevels }, (_, i) => {
        const levelIndex = i + 1;
        const isCompleted = levelIndex < currentPosition;
        const isCurrent = levelIndex === currentPosition;
        const isBossLevel = isBossChapter && levelIndex === totalLevels;

        return (
          <AdaptiveMotion.div
            key={levelIndex}
            className={cn(
              'rounded-full transition-all duration-300',
              isBossLevel ? 'w-4 h-4' : 'w-2 h-2',
              isCompleted && `bg-${accentColor}`,
              isCurrent && `bg-${accentColor} ring-2 ring-${accentColor}/50`,
              !isCompleted && !isCurrent && 'bg-neo-white/30'
            )}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.1, type: 'spring', stiffness: 500, damping: 25 }}
          >
            {isBossLevel && isCurrent && (
              <Crown className="w-full h-full p-0.5 text-neo-black" />
            )}
          </AdaptiveMotion.div>
        );
      })}
    </div>
  );
});

LevelDots.displayName = 'LevelDots';

// ==============================================
// MAIN COMPONENT
// ==============================================

const ChapterIndicator = memo<ChapterIndicatorProps>(({
  showFullName = true,
  className,
}) => {
  const { t } = useLanguage();
  const { isBoss, getLevelPosition } = useAdventureTheme();
  const chapter = useCurrentChapter();

  const levelPosition = getLevelPosition();
  const isCurrentBossLevel = isBoss();

  return (
    <AdaptiveMotion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-center gap-3',
        'px-3 py-2 rounded-neo',
        'bg-neo-black/40',
        'border border-neo-white/20',
        className
      )}
    >
      {/* Chapter number badge */}
      <div
        className={cn(
          'flex items-center justify-center',
          'w-8 h-8 rounded-full',
          'font-black text-sm',
          `bg-${chapter.accentColor}`,
          'text-neo-black'
        )}
      >
        {chapter.isBossChapter ? (
          <Crown className="w-4 h-4" />
        ) : (
          chapter.number
        )}
      </div>

      {/* Chapter info */}
      <div className="flex flex-col">
        {showFullName && (
          <span className="text-xs font-bold text-neo-white uppercase tracking-wide">
            {t(chapter.nameKey)}
          </span>
        )}

        {/* Level progress dots */}
        <LevelDots
          totalLevels={chapter.levelCount}
          currentPosition={levelPosition}
          accentColor={chapter.accentColor || 'neo-lime'}
          isBossChapter={chapter.isBossChapter}
        />
      </div>

      {/* Boss level indicator */}
      {isCurrentBossLevel && (
        <AdaptiveMotion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={cn(
            'flex items-center gap-1 px-2 py-1',
            'bg-neo-yellow/20 rounded-full',
            'text-neo-yellow text-xs font-bold'
          )}
        >
          <Star className="w-3 h-3 fill-current" />
          <span>{t('adventure.bossLabel')}</span>
        </AdaptiveMotion.div>
      )}
    </AdaptiveMotion.div>
  );
});

ChapterIndicator.displayName = 'ChapterIndicator';

export default ChapterIndicator;
