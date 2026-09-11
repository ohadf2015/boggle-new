'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, Plus, Square, SkipForward, Users, Zap } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import type { Socket } from 'socket.io-client';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ControlButton } from './controls/ControlButton';
import { ClassRosterSheet } from './controls/ClassRosterSheet';
import { useClassActivity } from './controls/useClassActivity';
import { useShortViewport } from './controls/useShortViewport';
import type { RosterMember } from './controls/classActivityModel';
import { useKickStudent } from '@/hooks/useKickStudent';

// Re-exported so existing importers of the strip keep working; the variable
// and the matching inset live in `controls/teacherBarInset` so a surface can
// reserve the space without importing this component.
export { TEACHER_BAR_HEIGHT_VAR } from './controls/teacherBarInset';
import { TEACHER_BAR_HEIGHT_VAR } from './controls/teacherBarInset';

/** Seconds added per "+30s" tap (server clamps 10..120). */
const EXTEND_SECONDS = 30;
/** How long "Tap again to end" stays armed before it quietly disarms. */
const END_ROUND_CONFIRM_MS = 4000;

interface TeacherLiveControlsProps {
  isPaused: boolean;
  /** Resolved mode of the live round (store `gameMode`); only 'word-hunt' matters here. */
  gameMode?: string | null;
  /**
   * A live Vocab Quiz owns the round. It is deliberately not a `GameMode`, so
   * `gameMode` cannot say — and the quiz reads `skipTargetWord` as "skip this
   * question", which is a control the teacher wants there too.
   */
  isQuizRound?: boolean;
  onPause: () => void;
  onResume: () => void;
  onExtendTime: (seconds: number) => void;
  onEndRound: () => void;
  onSkipWord: () => void;
  /** Everyone the server currently lists in the room; host and bots are filtered out. */
  students?: RosterMember[];
  /** The teacher's own seat name, so they are never counted as a student. */
  hostUsername?: string;
  /** Live socket — powers the activity feed and the remove-student emit. */
  socket?: Socket | null;
}

/**
 * The teacher's one control strip for a live classroom round.
 *
 * Kahoot's host gets a player count and a Start button, and removes a child by
 * clicking their name once with no confirmation. This bar answers the two
 * questions a teacher actually asks mid-round — "is the class with me?" and
 * "can I buy them thirty more seconds?" — with targets big enough to hit
 * without looking and type big enough to read from the back of the room.
 */
export function TeacherLiveControls({
  isPaused,
  gameMode,
  isQuizRound = false,
  onPause,
  onResume,
  onExtendTime,
  onEndRound,
  onSkipWord,
  students,
  hostUsername,
  socket,
}: TeacherLiveControlsProps) {
  const { t, language } = useLanguage();
  const isRtl = language === 'he';
  const [endArmed, setEndArmed] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const disarmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);

  // On a short window the strip gives its height back to the game surface.
  const compact = useShortViewport();
  const sizeClasses = compact
    ? 'min-h-[56px] px-3 text-base lg:text-lg'
    : 'min-h-[56px] sm:min-h-[60px] lg:min-h-[72px] xl:min-h-[80px] tv:min-h-[92px] px-3 lg:px-5 tv:px-6 text-base sm:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl tv:text-4xl';

  const members = useMemo(() => students ?? [], [students]);
  const showPulse = Array.isArray(students);
  const { rows, summary } = useClassActivity(socket, members, hostUsername);
  const { kick, statusOf } = useKickStudent(socket);

  // ---- Reserve our own space so nothing important sits under the bar ----
  useLayoutEffect(() => {
    const root = document.documentElement;
    const publish = () => {
      const rect = barRef.current?.getBoundingClientRect();
      // Reserve the whole gap from the bar's top edge to the viewport floor —
      // the wrapper's own bottom padding and the safe-area inset sit under the
      // bar and would otherwise leave that slice of the leaderboard covered.
      // A zero-height rect means "not laid out yet"; reserving the full
      // viewport in that frame would collapse the board.
      const reserved = !rect || rect.height === 0 ? 0 : Math.max(0, window.innerHeight - rect.top);
      root.style.setProperty(TEACHER_BAR_HEIGHT_VAR, `${Math.round(reserved)}px`);
    };
    publish();

    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined' && barRef.current) {
      observer = new ResizeObserver(publish);
      observer.observe(barRef.current);
    }
    window.addEventListener('resize', publish);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', publish);
      root.style.removeProperty(TEACHER_BAR_HEIGHT_VAR);
    };
  }, [rosterOpen]);

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

  return (
    <div
      role="toolbar"
      aria-label={t('education.liveControls.title')}
      dir={isRtl ? 'rtl' : 'ltr'}
      data-testid="teacher-live-controls"
      data-paused={isPaused ? 'true' : 'false'}
      className={cn(
        // Above GamePausedOverlay (z-[60]) so Resume is always reachable.
        'pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col',
        'px-2 sm:px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2',
      )}
    >
      {rosterOpen && showPulse && (
        <ClassRosterSheet rows={rows} statusOf={statusOf} onRemove={kick} t={t} />
      )}

      <div
        ref={barRef}
        className={cn(
          // Wide enough that five controls sit on ONE row at projector widths. At
          // max-w-3xl they wrapped to two rows and the strip reserved a third of a
          // 1280x630 screen — space taken straight off the board.
          'pointer-events-auto mx-auto flex w-full max-w-6xl tv:max-w-[100rem] flex-wrap lg:flex-nowrap items-stretch justify-center',
          'gap-2 sm:gap-3 tv:gap-5 rounded-neo border-3 tv:border-4 border-neo-black shadow-hard-lg',
          compact ? 'p-1.5' : 'p-2 tv:p-4',
          isPaused ? 'bg-neo-lime' : 'bg-neo-cream',
        )}
      >
        {isPaused && (
          <span
            data-testid="teacher-paused-flag"
            className={cn(
              'inline-flex items-center gap-2 rounded-neo border-3 lg:border-4 border-neo-black',
              'bg-neo-black font-neo-display font-black uppercase tracking-widest text-neo-lime',
              sizeClasses,
              'motion-safe:animate-pulse',
            )}
          >
            {t('education.liveControls.pausedTitle')}
          </span>
        )}

        {showPulse && (
          <button
            type="button"
            data-testid="teacher-class-pulse"
            aria-expanded={rosterOpen}
            aria-label={t('education.liveControls.studentsCount', { count: summary.total })}
            onClick={() => setRosterOpen((open) => !open)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 lg:gap-3 tv:gap-4 leading-none',
              'rounded-neo border-3 lg:border-4 border-neo-black bg-neo-navy shadow-hard lg:shadow-hard-lg',
              'font-neo-display font-black uppercase tracking-wide text-neo-cream',
              sizeClasses,
              'transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2',
            )}
          >
            <Users
              className={cn('h-5 w-5 shrink-0', !compact && 'lg:h-7 lg:w-7 xl:h-8 xl:w-8 tv:h-10 tv:w-10')}
              aria-hidden="true"
            />
            {/* A bare numeral reads from the back row in every one of the six
                locales and dodges the "1 students" agreement break; the full
                sentence stays on the accessible name. */}
            <span className="tabular-nums">{summary.total}</span>
            {summary.idle > 0 && (
              <span
                data-testid="teacher-idle-chip"
                aria-label={t('education.liveControls.idleCount', { count: summary.idle })}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md border-2 tv:border-3 border-neo-black bg-neo-pink',
                  'px-2 lg:px-3 py-1 text-xs sm:text-sm lg:text-lg xl:text-xl tv:text-2xl font-black text-neo-white',
                )}
              >
                <Zap className="h-3 w-3 lg:h-5 lg:w-5 tv:h-6 tv:w-6" aria-hidden="true" />
                <span className="tabular-nums">{summary.idle}</span>
              </span>
            )}
          </button>
        )}

        <ControlButton
          compact={compact}
          testId="teacher-pause-toggle"
          tone={isPaused ? 'go' : 'neutral'}
          ariaPressed={isPaused}
          icon={isPaused ? <Play /> : <Pause />}
          label={isPaused ? t('education.liveControls.resume') : t('education.liveControls.pause')}
          onClick={isPaused ? onResume : onPause}
          className="flex-1 basis-[8rem]"
        />

        <ControlButton
          compact={compact}
          testId="teacher-extend-time"
          tone="time"
          icon={<Plus />}
          label={t('education.liveControls.addTime', { seconds: EXTEND_SECONDS })}
          onClick={() => onExtendTime(EXTEND_SECONDS)}
          className="flex-1 basis-[6.5rem]"
        />

        {(isQuizRound || gameMode === 'word-hunt') && (
          <ControlButton
            compact={compact}
            testId="teacher-skip-word"
            tone="neutral"
            icon={<DirectionalIcon icon={SkipForward} mirror />}
            label={t(isQuizRound ? 'education.liveControls.skipQuestion' : 'education.liveControls.skipWord')}
            onClick={onSkipWord}
            className="flex-1 basis-[7.5rem] bg-neo-cream"
          />
        )}

        <ControlButton
          compact={compact}
          testId="teacher-end-round"
          tone={endArmed ? 'armed' : 'danger'}
          dataArmed={endArmed}
          icon={<Square />}
          label={endArmed ? t('education.liveControls.endRoundConfirm') : t('education.liveControls.endRound')}
          onClick={handleEndRound}
          className="flex-1 basis-[8rem]"
        />
      </div>
    </div>
  );
}

export default TeacherLiveControls;
