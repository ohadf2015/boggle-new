'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, Plus, Square, SkipForward } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface TeacherLiveControlsProps {
  isPaused: boolean;
  /** Resolved mode of the live round (store `gameMode`); only 'word-hunt' matters here. */
  gameMode?: string | null;
  onPause: () => void;
  onResume: () => void;
  onExtendTime: (seconds: number) => void;
  onEndRound: () => void;
  onSkipWord: () => void;
}

/** Seconds added per "+30s" tap (server clamps 10..120). */
const EXTEND_SECONDS = 30;
/** How long "Tap again to end" stays armed before it quietly disarms. */
const END_ROUND_CONFIRM_MS = 4000;

/**
 * Floating teacher bar shown to the classroom host during a live round.
 *
 * Big (44px+) targets because it is tapped on a tablet from across a
 * classroom; ending the round takes a second tap so a stray touch never wipes
 * a round the class is mid-way through. Sits ABOVE the paused overlay so
 * "Resume" stays reachable while everything else is frozen.
 */
export function TeacherLiveControls({
  isPaused,
  gameMode,
  onPause,
  onResume,
  onExtendTime,
  onEndRound,
  onSkipWord,
}: TeacherLiveControlsProps) {
  const { t, language } = useLanguage();
  const isRtl = language === 'he';
  const [endArmed, setEndArmed] = useState(false);
  const disarmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDisarm = useCallback(() => {
    if (disarmTimerRef.current) {
      clearTimeout(disarmTimerRef.current);
      disarmTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearDisarm, [clearDisarm]);

  const handleEndRound = useCallback(() => {
    if (endArmed) {
      clearDisarm();
      setEndArmed(false);
      onEndRound();
      return;
    }
    setEndArmed(true);
    clearDisarm();
    disarmTimerRef.current = setTimeout(() => {
      setEndArmed(false);
      disarmTimerRef.current = null;
    }, END_ROUND_CONFIRM_MS);
  }, [endArmed, clearDisarm, onEndRound]);

  const buttonBase = cn(
    'inline-flex items-center justify-center gap-2 min-h-[52px] px-4 sm:px-5',
    'rounded-neo border-3 border-black shadow-hard text-black font-neo-display font-bold text-base sm:text-lg',
    'transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-yellow',
  );

  return (
    <div
      role="toolbar"
      aria-label={t('education.liveControls.title')}
      dir={isRtl ? 'rtl' : 'ltr'}
      data-testid="teacher-live-controls"
      className={cn(
        // Above GamePausedOverlay (z-[60]) so Resume is always reachable.
        'fixed inset-x-0 bottom-0 z-[70] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2',
        'pointer-events-none',
      )}
    >
      <div
        className={cn(
          'pointer-events-auto mx-auto flex w-full max-w-2xl flex-wrap items-center justify-center gap-2 sm:gap-3',
          'rounded-neo border-3 border-black bg-neo-cream p-2 sm:p-3 shadow-hard-lg',
        )}
      >
        <button
          type="button"
          data-testid="teacher-pause-toggle"
          aria-pressed={isPaused}
          onClick={isPaused ? onResume : onPause}
          className={cn(buttonBase, 'flex-1 basis-[7.5rem]', isPaused ? 'bg-neo-lime' : 'bg-neo-cyan')}
        >
          {isPaused ? <Play className="h-5 w-5" aria-hidden="true" /> : <Pause className="h-5 w-5" aria-hidden="true" />}
          <span>{isPaused ? t('education.liveControls.resume') : t('education.liveControls.pause')}</span>
        </button>

        <button
          type="button"
          data-testid="teacher-extend-time"
          onClick={() => onExtendTime(EXTEND_SECONDS)}
          className={cn(buttonBase, 'flex-1 basis-[6rem] bg-neo-yellow')}
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          <span>{t('education.liveControls.addTime', { seconds: EXTEND_SECONDS })}</span>
        </button>

        {gameMode === 'word-hunt' && (
          <button
            type="button"
            data-testid="teacher-skip-word"
            onClick={onSkipWord}
            className={cn(buttonBase, 'flex-1 basis-[7rem] bg-neo-cream')}
          >
            <SkipForward className="h-5 w-5" aria-hidden="true" />
            <span>{t('education.liveControls.skipWord')}</span>
          </button>
        )}

        <button
          type="button"
          data-testid="teacher-end-round"
          data-armed={endArmed ? 'true' : 'false'}
          aria-live="polite"
          onClick={handleEndRound}
          className={cn(buttonBase, 'flex-1 basis-[7.5rem]', endArmed ? 'bg-neo-pink animate-pulse' : 'bg-neo-pink/70')}
        >
          <Square className="h-5 w-5" aria-hidden="true" />
          <span>{endArmed ? t('education.liveControls.endRoundConfirm') : t('education.liveControls.endRound')}</span>
        </button>
      </div>
    </div>
  );
}

export default TeacherLiveControls;
