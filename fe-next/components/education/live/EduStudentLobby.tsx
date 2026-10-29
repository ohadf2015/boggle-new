'use client';

/** The one student waiting stage: same slots as before, so READY still drives the teacher's ready count and auto-start. */
import { LogOut, Pencil, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClassroomWaitingStageProps } from '@/components/education/lobby/ClassroomWaitingStage';
import { WaitingWarmUp } from '@/components/education/lobby/WaitingWarmUp';
import { LIVE_KEYFRAMES, PRESS } from './eduLiveStyles';
import { EduStudentLobbyCrowd } from './EduStudentLobbyCrowd';
import { EduStudentLobbyHud } from './EduStudentLobbyHud';

const STICKER_KEYFRAMES = '@keyframes edu-sticker-slap{0%{transform:rotate(-30deg) scale(2)}100%{transform:rotate(-8deg) scale(1)}}';

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
  const others = classmates.filter((c) => c.username !== username);
  const classSize = others.length + 1;

  return (
    <div data-testid="edu-student-lobby" className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-neo-navy text-neo-cream">
      <style>{LIVE_KEYFRAMES + STICKER_KEYFRAMES}</style>
      <header className="flex shrink-0 items-center justify-between gap-3 pe-16 ps-4 pt-3">
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
          <LogOut className="size-4 rtl:-scale-x-100" aria-hidden="true" />
          {t('eduLiveRoom.student.leave')}
        </button>
      </header>

      {/* my-auto, not justify-*: when a short phone overflows, auto margins collapse and nothing clips above the scroll start. */}
      <main className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-2 [container-type:size]">
        <div className="my-auto flex w-full flex-col items-center gap-3">
          <h1 className="-rotate-2 font-neo-display text-[clamp(1.75rem,8cqh,3rem)] font-black leading-none text-neo-lime [-webkit-text-stroke:2px_rgb(var(--neo-black))] [paint-order:stroke_fill] drop-shadow-[3px_3px_0_rgb(var(--neo-black))] motion-safe:animate-[edu-live-pop_220ms_cubic-bezier(0.23,1,0.32,1)_both] [@container(max-height:460px)]:hidden">
            {t('eduLiveRoom.student.youreIn')}
          </h1>

          <div className="flex w-full max-w-sm items-center gap-3">
            <div className="relative shrink-0">
              <button
                type="button"
                data-testid="edu-student-edit-avatar"
                onClick={onEditAvatar}
                aria-label={t('eduLiveRoom.student.changeLook')}
                className={cn('relative block size-[clamp(4.5rem,18cqh,7.5rem)] overflow-hidden rounded-full border-4 border-neo-black bg-neo-cream shadow-hard-lg [&_svg]:h-full [&_svg]:w-full', PRESS, isReady && 'ring-4 ring-neo-lime')}
              >
                {avatar}
                <span aria-hidden="true" className="absolute bottom-0.5 end-0.5 grid size-7 place-items-center rounded-full border-[3px] border-neo-black bg-neo-yellow text-neo-black">
                  <Pencil className="size-3.5" />
                </span>
              </button>
              {isReady && (
                <span
                  data-testid="edu-student-ready-sticker"
                  className="pointer-events-none absolute inset-x-0 -top-3 mx-auto w-max rotate-[-8deg] rounded-neo border-[3px] border-neo-black bg-neo-lime px-2 py-0.5 font-neo-display text-sm font-black uppercase text-neo-black shadow-hard-sm motion-safe:animate-[edu-sticker-slap_360ms_cubic-bezier(.34,1.56,.64,1)]"
                >
                  {t('eduStudent.lobby.readySticker')}
                </span>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
              <div className="flex w-full min-w-0 items-center justify-between gap-2">
                <div className="min-w-0 font-neo-display text-2xl font-black">{nameSlot}</div>
                {emoteSlot && <div className="shrink-0">{emoteSlot}</div>}
              </div>
              <EduStudentLobbyHud t={t} />
            </div>
          </div>

          {quickPickSlot}

          <div className="flex w-full justify-center [@container(max-height:380px)]:hidden">
            <WaitingWarmUp username={username} t={t} />
          </div>

          <EduStudentLobbyCrowd others={others} statusSlot={statusSlot} t={t} />
        </div>
      </main>

      <footer className="flex shrink-0 flex-col gap-2 border-t-[3px] border-neo-cream bg-neo-navy-light px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {readySlot}
        {instructionsSlot}
      </footer>
    </div>
  );
}

export default EduStudentLobby;
