'use client';

/** Same slots as the shared waiting stage, so READY still drives the teacher's ready count and auto-start. */
import { LogOut, Pencil, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClassroomWaitingStageProps } from '@/components/education/lobby/ClassroomWaitingStage';
import { EDU_MASCOT } from '@/lib/education/mascotArt';
import { LIVE_KEYFRAMES, PRESS } from './eduLiveStyles';

export function EduStudentLobby({
  username,
  avatar,
  onEditAvatar,
  nameSlot,
  readySlot,
  statusSlot,
  emoteSlot,
  quickPickSlot,
  instructionsSlot,
  classmates,
  onExit,
  isReady = false,
  t,
}: ClassroomWaitingStageProps) {
  const classSize = classmates.some((c) => c.username === username) ? classmates.length : classmates.length + 1;

  return (
    <div data-testid="edu-student-lobby" className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-neo-navy text-neo-cream">
      <style>{LIVE_KEYFRAMES}</style>
      <header className="flex shrink-0 items-center justify-between gap-3 pe-16 ps-4 pt-4">
        <span data-testid="edu-student-count" className="inline-flex items-center gap-1.5 rounded-full border-[3px] border-neo-black bg-neo-cyan px-3 py-1 font-neo-display text-sm font-black text-neo-black shadow-hard-sm">
          <Users className="size-4" aria-hidden="true" />
          {t('eduLiveRoom.student.inClass', { count: classSize })}
        </span>
        <button
          type="button"
          data-testid="edu-student-leave"
          onClick={onExit}
          aria-label={t('eduLiveRoom.student.leave')}
          className={cn('inline-flex min-h-11 items-center gap-1.5 rounded-neo border-[3px] border-neo-cream bg-neo-navy-elevated px-3 font-neo-display text-sm font-black uppercase text-neo-cream shadow-hard-sm hover:bg-neo-navy-light', PRESS)}
        >
          <LogOut className="size-4" aria-hidden="true" />
          {t('eduLiveRoom.student.leave')}
        </button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-4 py-4">
        <h1 className="-rotate-2 font-neo-display text-5xl font-black leading-none text-neo-lime [-webkit-text-stroke:2px_#000] [paint-order:stroke_fill] drop-shadow-[3px_3px_0_#000] motion-safe:animate-[edu-live-pop_220ms_cubic-bezier(0.23,1,0.32,1)_both]">
          {t('eduLiveRoom.student.youreIn')}
        </h1>

        <div className="relative">
          <button
            type="button"
            data-testid="edu-student-edit-avatar"
            onClick={onEditAvatar}
            aria-label={t('eduLiveRoom.student.changeLook')}
            className={cn('relative size-36 overflow-hidden rounded-full border-4 border-neo-black bg-neo-cream shadow-hard-lg', PRESS, isReady && 'ring-4 ring-neo-lime')}
          >
            {avatar}
            <span aria-hidden="true" className="absolute bottom-1 end-1 grid size-9 place-items-center rounded-full border-[3px] border-neo-black bg-neo-yellow text-neo-black">
              <Pencil className="size-4" />
            </span>
          </button>
          {emoteSlot && <div className="absolute -end-14 top-0">{emoteSlot}</div>}
        </div>

        <div className="font-neo-display text-2xl font-black">{nameSlot}</div>
        {quickPickSlot}

        <div data-testid="edu-student-watch" className="flex w-full max-w-sm items-center gap-3 rounded-neo-lg border-[3px] border-neo-cream bg-neo-navy-light p-3 shadow-hard">
          {/* eslint-disable-next-line @next/next/no-img-element -- mascot art map path, decorative */}
          <img src={EDU_MASCOT.gameStart} alt="" aria-hidden="true" className="size-16 shrink-0 select-none motion-safe:animate-[edu-live-bob_2.4s_ease-in-out_infinite]" />
          <p className="font-neo-body text-base font-bold leading-snug text-neo-cream">{t('eduLiveRoom.student.watchBoard')}</p>
        </div>
        {statusSlot}
      </main>

      <footer className="flex shrink-0 flex-col gap-2 border-t-[3px] border-neo-cream bg-neo-navy-light px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {readySlot}
        {instructionsSlot}
      </footer>
    </div>
  );
}

export default EduStudentLobby;
