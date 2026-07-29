/**
 * QuickStartButton
 *
 * One-click game start button that displays a preview of the last game configuration.
 * Allows teachers to quickly repeat their most recent game setup.
 */

'use client';

import { Play, Clock, Grid3X3, BookOpen } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { GameConfiguration } from '@/hooks/useRecentGameSettings';

export interface QuickStartButtonProps {
  /** The game configuration to display and start */
  config: GameConfiguration | null;
  /** Click handler - called with the config when button is clicked */
  onClick?: (config: GameConfiguration) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get board size display label
 */
function getBoardSizeLabel(size: 'small' | 'medium' | 'large'): string {
  switch (size) {
    case 'small':
      return '4×4';
    case 'medium':
      return '5×5';
    case 'large':
      return '6×6';
  }
}

export default function QuickStartButton({
  config,
  onClick,
  className,
}: QuickStartButtonProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';

  // Don't render if no config
  if (!config) {
    return null;
  }

  const handleClick = () => {
    onClick?.(config);
  };

  // Format lesson names (truncate if too many)
  const displayLessons =
    config.lessonNames.length > 2
      ? `${config.lessonNames.slice(0, 2).join(', ')}...`
      : config.lessonNames.join(', ');

  return (
    <button
      onClick={handleClick}
      className={cn(
        'group w-full p-4 rounded-neo border-neo border-neo-black',
        'bg-neo-lime/90 hover:bg-neo-lime',
        'shadow-hard hover:shadow-hard-lg transition-all',
        'text-left hover:translate-x-[-2px] hover:translate-y-[-2px]',
        'focus:outline-hidden focus:ring-2 focus:ring-neo-lime',
        isRTL && 'rtl text-right',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-10 h-10 rounded-neo bg-neo-black flex items-center justify-center',
              'shadow-hard-sm'
            )}
          >
            <Play className="w-5 h-5 text-neo-lime" />
          </div>
          <div>
            <h4 className="font-neo-display text-neo-black font-bold">
              {t('teacher.dashboard.quickStart')}
            </h4>
            <p className="text-xs text-neo-black/70">
              {t('teacher.dashboard.repeatLastGame')}
            </p>
          </div>
        </div>
        <div className="text-neo-black opacity-50 group-hover:opacity-100 transition-opacity">
          →
        </div>
      </div>

      {/* Config Preview */}
      <div className="space-y-2 bg-neo-black/10 rounded-neo p-3">
        {/* Classroom */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-neo-black/60 font-bold min-w-[60px]">Class:</span>
          <span className="text-neo-black font-bold truncate">
            {config.classroomName}
          </span>
        </div>

        {/* Lessons */}
        <div className="flex items-center gap-2 text-sm">
          <BookOpen className="w-4 h-4 text-neo-black/60 shrink-0" />
          <span className="text-neo-black truncate">{displayLessons}</span>
        </div>

        {/* Settings Row */}
        <div className="flex items-center gap-4 text-xs text-neo-black/80">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span className="tabular-nums">
              {config.settings.timerMinutes} {t('common.minutes')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Grid3X3 className="w-3 h-3" />
            <span>{getBoardSizeLabel(config.settings.boardSize)}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
