'use client';

/**
 * Practice run: the teacher plays the real student page (?practiceSeat=1), full screen at every width.
 * The host board stays mounted underneath because it owns the room, the bots and the round start.
 */
import { useEffect, useState } from 'react';
import { Howler } from 'howler';
import { LogOut, MonitorSmartphone, Presentation, RotateCw, SkipForward } from 'lucide-react';
import { PRACTICE_NEEDS_BOARD_EVENT, PRACTICE_SEAT_RETRY_EVENT, PRACTICE_SEAT_TIMEOUT_MS, PRACTICE_SKIP_TO_GAME_EVENT } from '@/host/hooks/useRehearseAutoStart';
import { useRegisterHeaderAudioControl } from '@/contexts/NavigationContext';
import { cn } from '@/lib/utils';
import { practiceSeatPath } from '@/lib/education/classroomLivePath';
import { NB_BLOCK, NB_SMALL } from '@/components/teacher/nb/nbStyles';
import type { Translate } from './eduLiveStyles';

interface PracticeRunPanelProps {
  gameCode: string;
  language: string;
  /** The practice seat is in the room. */
  joined: boolean;
  started: boolean;
  ended: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExit: () => void;
  t: Translate;
}

export function PracticeRunPanel({ gameCode, language, joined, started, ended, open, onOpenChange, onExit, t }: PracticeRunPanelProps) {
  const [frameKey, setFrameKey] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const [hasStarted, setHasStarted] = useState(started);
  if (started && !hasStarted) setHasStarted(true);
  useRegisterHeaderAudioControl();

  useEffect(() => {
    const reload = () => {
      setTimedOut(false);
      setFrameKey((n) => n + 1);
    };
    window.addEventListener(PRACTICE_SEAT_RETRY_EVENT, reload);
    return () => window.removeEventListener(PRACTICE_SEAT_RETRY_EVENT, reload);
  }, []);

  useEffect(() => {
    const showBoard = () => onOpenChange(false);
    window.addEventListener(PRACTICE_NEEDS_BOARD_EVENT, showBoard);
    return () => window.removeEventListener(PRACTICE_NEEDS_BOARD_EVENT, showBoard);
  }, [onOpenChange]);

  useEffect(() => {
    if (joined) {
      setTimedOut(false);
      return;
    }
    const id = setTimeout(() => setTimedOut(true), PRACTICE_SEAT_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [joined, frameKey]);

  // The frame plays its own sound; the board behind it would double every effect.
  useEffect(() => {
    Howler.mute(open);
    return () => { Howler.mute(false); };
  }, [open]);

  return (
    <>
      <div data-testid="practice-run-panel" className={cn('fixed inset-0 z-[65] flex-col bg-neo-navy', open ? 'flex' : 'hidden')}>
        <header className="flex shrink-0 items-center gap-2 border-b-[3px] border-neo-cream bg-neo-navy-light px-2 pb-1.5 pt-[max(0.375rem,env(safe-area-inset-top))]">
          <h2 className="min-w-0 truncate font-neo-display text-base font-black text-neo-cream max-sm:sr-only">{t('eduLiveRoom.practice.title')}</h2>
          <div className="ms-auto flex items-center gap-2">
            {joined && !hasStarted && (
              <button type="button" data-testid="practice-run-skip" onClick={() => window.dispatchEvent(new Event(PRACTICE_SKIP_TO_GAME_EVENT))} className={cn(NB_SMALL, NB_BLOCK.cyan)}>
                <SkipForward className="size-4 rtl:-scale-x-100" aria-hidden="true" />
                {t('eduLiveRoom.practice.skip')}
              </button>
            )}
            <button
              type="button"
              data-testid="practice-run-teacher-view"
              onClick={() => onOpenChange(false)}
              aria-label={t('eduLiveRoom.practice.teacherView')}
              title={t('eduLiveRoom.practice.teacherView')}
              className={cn(NB_SMALL, NB_BLOCK.navy, 'max-sm:min-w-11 max-sm:px-0')}
            >
              <Presentation className="size-4" aria-hidden="true" />
              <span className="max-sm:hidden">{t('eduLiveRoom.practice.teacherView')}</span>
            </button>
            <button type="button" data-testid="practice-run-exit" onClick={onExit} className={cn(NB_SMALL, ended ? NB_BLOCK.lime : NB_BLOCK.cream)}>
              <LogOut className="size-4 rtl:-scale-x-100" aria-hidden="true" />
              {t(ended ? 'eduLiveRoom.practice.backToClass' : 'eduLiveRoom.practice.end')}
            </button>
          </div>
        </header>
        <div className="relative min-h-0 flex-1">
          <iframe
            key={frameKey}
            data-testid="practice-run-frame"
            src={practiceSeatPath(language, gameCode)}
            title={t('eduLiveRoom.practice.frameTitle')}
            allow="clipboard-write"
            className="absolute inset-0 size-full border-0"
          />
          {timedOut && !joined && (
            <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neo-navy p-6 text-center">
              <p className="max-w-sm font-neo-display text-lg font-black text-neo-cream">{t('eduLiveRoom.practice.seatRetry')}</p>
              <button type="button" data-testid="practice-run-retry" onClick={() => window.dispatchEvent(new Event(PRACTICE_SEAT_RETRY_EVENT))} className={cn(NB_SMALL, NB_BLOCK.lime)}>
                <RotateCw className="size-4" aria-hidden="true" />
                {t('eduLiveRoom.practice.retry')}
              </button>
              <button type="button" data-testid="practice-run-timeout-teacher-view" onClick={() => onOpenChange(false)} className={cn(NB_SMALL, NB_BLOCK.navy)}>
                <Presentation className="size-4" aria-hidden="true" />
                {t('eduLiveRoom.practice.teacherView')}
              </button>
            </div>
          )}
        </div>
      </div>
      {!open && (
        <button
          type="button"
          data-testid="practice-run-show"
          onClick={() => onOpenChange(true)}
          className={cn(NB_SMALL, NB_BLOCK.cyan, 'fixed bottom-[calc(var(--lc-teacher-bar-h,0px)+0.75rem)] end-3 z-[71]')}
        >
          <MonitorSmartphone className="size-4" aria-hidden="true" />
          {t('eduLiveRoom.practice.show')}
        </button>
      )}
    </>
  );
}

export default PracticeRunPanel;
