/**
 * RepeatLastGameButton
 *
 * Dashboard hero that recreates the teacher's exact previous setup —
 * classroom, lessons, timer, board — by sending them to the launcher in
 * `repeatLast` flow, where ClassroomGameLobby prefills everything from the
 * most recent saved configuration. Distinct from Quick Start (which only
 * pre-selects a lesson): this is Friday's room, one tap from done.
 */

'use client';

import { History, Clock, Grid3X3, BookOpen } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { GameConfiguration } from '@/hooks/useRecentGameSettings';

export interface RepeatLastGameButtonProps {
  config: GameConfiguration | null;
  onClick?: (config: GameConfiguration) => void;
  className?: string;
}

export default function RepeatLastGameButton({
  config,
  onClick,
  className,
}: RepeatLastGameButtonProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';

  if (!config) return null;

  const displayLessons =
    config.lessonNames.length > 2
      ? `${config.lessonNames.slice(0, 2).join(', ')}...`
      : config.lessonNames.join(', ');

  return (
    <button
      type="button"
      data-testid="repeat-last-game-button"
      onClick={() => onClick?.(config)}
      className={cn(
        'group w-full p-4 rounded-neo border-neo border-neo-black',
        'bg-neo-yellow/90 hover:bg-neo-yellow',
        'shadow-hard hover:shadow-hard-lg transition-all',
        'text-left hover:translate-x-[-2px] hover:translate-y-[-2px]',
        'focus:outline-hidden focus:ring-2 focus:ring-neo-yellow',
        isRTL && 'rtl text-right',
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-neo bg-neo-black flex items-center justify-center shadow-hard-sm">
            <History className="w-5 h-5 text-neo-yellow" />
          </div>
          <div>
            <h4 className="font-neo-display text-neo-black font-bold">
              {t('teacher.dashboard.repeatLastGame')}
            </h4>
            <p className="text-xs text-neo-black/70">
              {t('teacher.dashboard.repeatLastGameDesc')}
            </p>
          </div>
        </div>
        <div className="text-neo-black opacity-50 group-hover:opacity-100 transition-opacity">
          →
        </div>
      </div>

      <div className="space-y-2 bg-neo-black/10 rounded-neo p-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-neo-black/60 font-bold min-w-[60px]">
            {t('teacher.dashboard.quickStartClassLabel')}
          </span>
          <span className="text-neo-black font-bold truncate">{config.classroomName}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <BookOpen className="w-4 h-4 text-neo-black/60 shrink-0" />
          <span className="text-neo-black truncate">{displayLessons}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-neo-black/80">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span className="tabular-nums">
              {config.settings.timerMinutes} {t('common.minutes')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Grid3X3 className="w-3 h-3" />
            <span>
              {config.settings.boardSize === 'small' ? '4×4' : config.settings.boardSize === 'medium' ? '5×5' : '6×6'}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
