/**
 * ClassroomWaitingStage — what a student sees between typing the code and the
 * teacher pressing Start: the projector's arena, the student's own face (tap to
 * dress up, or pick a ready-made look), a warm-up tap game, Lexi and the
 * classmates arriving in one crowd card, and READY in a dock nothing overlaps.
 *
 * Motion is CSS only (`motion-safe:`), transform-based, never an opacity tween
 * (Class 5). Dark-only: `bg-neo-navy` hardcoded. It sits under the page's
 * EducationHeader + mode strip, so it is `flex-1 min-h-0` and never scrolls.
 */

'use client';

import type { ReactNode } from 'react';
import { LogOut, Pencil, Users } from 'lucide-react';
import Avatar from '@/components/Avatar';
import type { Avatar as AvatarType } from '@/shared/types/game';
import { cn } from '@/lib/utils';
import { tr, type EduT } from './eduText';
import { WaitingWarmUp } from './WaitingWarmUp';

/** Keyframes for the stage's CSS-only juice. Transform only — never opacity (Class 5). */
const STAGE_KEYFRAMES =
  '@keyframes lc-ready-pulse{0%,100%{transform:rotate(-2deg) scale(1)}50%{transform:rotate(-2deg) scale(1.07)}}' +
  '@keyframes lc-mate-pop{0%{transform:scale(0.3)}65%{transform:scale(1.18)}100%{transform:scale(1)}}' +
  '@keyframes lc-tile-hit{0%{transform:scale(1.35)}100%{transform:scale(1)}}' +
  '@keyframes lc-tile-glow{0%,100%{transform:scale(1.1)}50%{transform:scale(1.18)}}' +
  '@keyframes lc-lexi-idle{0%,100%{transform:rotate(-3deg) translateY(0)}50%{transform:rotate(2deg) translateY(-6px)}}' +
  '@keyframes lc-sticker-slap{0%{transform:rotate(-30deg) scale(2)}100%{transform:rotate(-8deg) scale(1)}}';

export interface WaitingClassmate {
  username: string;
  avatar?: AvatarType | null;
}

export interface ClassroomWaitingStageProps {
  username: string;
  /** The student's own big face (already rendered, with their live emote mood). */
  avatar: ReactNode;
  onEditAvatar: () => void;
  /** Name + the guest rename control. */
  nameSlot: ReactNode;
  readySlot?: ReactNode;
  statusSlot?: ReactNode;
  emoteSlot?: ReactNode;
  /** One-tap looks under the avatar. */
  quickPickSlot?: ReactNode;
  /** Collapsed how-to-play for board modes; nothing for a quiz. */
  instructionsSlot?: ReactNode;
  /** Everyone in the room except the teacher (the student may be in it). */
  classmates: WaitingClassmate[];
  onExit: () => void;
  isReady?: boolean;
  t: EduT;
}

const MAX_FACES = 9;

export function ClassroomWaitingStage({
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
  const shownFaces = others.slice(0, MAX_FACES);
  const hiddenCount = others.length - shownFaces.length;

  return (
    <div
      data-testid="classroom-waiting-stage"
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-neo-navy"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative art / avatar data URLs: next/image adds nothing */}
      <img
        data-testid="waiting-stage-art"
        src="/images/education/arena-lobby-bg.webp"
        alt=""
        aria-hidden="true"
        loading="eager"
        decoding="async"
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-bottom"
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-neo-navy/45" />
      <style>{STAGE_KEYFRAMES}</style>

      <div className="relative flex shrink-0 items-center justify-between gap-2 px-3 pt-2">
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border-[3px] border-neo-cream bg-neo-navy/90 px-2.5 py-1 shadow-hard-sm">
          <Users className="size-4 text-neo-cyan" aria-hidden="true" />
          <span data-testid="classroom-waiting-count" className="font-neo-display text-base font-black tabular-nums text-neo-cream">
            {classmates.length}
          </span>
          <span className="font-neo-body text-xs font-bold uppercase tracking-wide text-neo-cream/85">
            {tr(t, 'academy.waiting.inClass', 'in class')}
          </span>
        </span>
        <p
          data-testid="waiting-get-ready"
          className="min-w-0 truncate -rotate-2 rounded-neo border-[3px] border-neo-black bg-neo-yellow px-3 py-0.5 font-neo-display text-[clamp(1rem,3dvh,2.25rem)] font-black uppercase leading-tight tracking-tight text-neo-black shadow-hard motion-safe:animate-[lc-ready-pulse_1.6s_ease-in-out_infinite]"
        >
          {tr(t, 'academy.live.getReady', 'Get ready!')}
        </p>
        <button
          type="button"
          onClick={onExit}
          aria-label={t('common.exit')}
          className="flex size-9 shrink-0 items-center justify-center rounded border-2 border-neo-black bg-neo-red text-neo-black shadow-hard-sm transition-all active:translate-y-0.5 active:shadow-none"
        >
          <LogOut className="size-4 text-neo-black rtl:scale-x-[-1]" aria-hidden="true" />
        </button>
      </div>

      <div className="relative flex shrink-0 justify-center px-3 pt-2 [@media(max-height:760px)]:hidden">
        <WaitingWarmUp username={username} t={t} />
      </div>

      {/* Clipped, so nothing in here can ever paint over the READY dock below. */}
      <div
        data-testid="waiting-spotlight"
        className="relative flex min-h-0 flex-1 flex-col items-center justify-evenly gap-1.5 overflow-hidden px-3 py-1 [@media(max-height:450px)]:flex-row"
      >
        <div className="relative flex items-end justify-center gap-2">
          <button
            type="button"
            data-testid="edit-avatar-button"
            onClick={onEditAvatar}
            aria-label={tr(t, 'academy.waiting.editAvatar', 'Change your avatar')}
            className={cn(
              'group relative shrink-0 rounded-full border-[3px] border-neo-lime bg-neo-navy p-1 shadow-hard-lg motion-safe:animate-avatar-float',
              isReady && 'ring-4 ring-neo-lime'
            )}
          >
            <span
              key={isReady ? 'ready' : 'idle'}
              className="block size-[clamp(3.5rem,12dvh,11rem)] overflow-hidden rounded-full border-[3px] border-neo-cream motion-safe:animate-[lc-mate-pop_420ms_cubic-bezier(.34,1.56,.64,1)] [&_svg]:h-full [&_svg]:w-full"
            >
              {avatar}
            </span>
            <span className="absolute -bottom-1 end-1 flex size-8 items-center justify-center rounded-full border-2 border-neo-black bg-neo-cyan shadow-hard-sm">
              <Pencil className="size-4 text-neo-black" aria-hidden="true" />
            </span>
            {isReady && (
              <span
                data-testid="waiting-ready-sticker"
                className="absolute inset-x-0 -top-2 mx-auto w-max rotate-[-8deg] rounded-neo border-[3px] border-neo-black bg-neo-lime px-2 py-0.5 font-neo-display text-sm font-black uppercase text-neo-black shadow-hard-sm motion-safe:animate-[lc-sticker-slap_360ms_cubic-bezier(.34,1.56,.64,1)]"
              >
                {tr(t, 'eduStudent.lobby.readySticker', 'Ready!')}
              </span>
            )}
          </button>
          {emoteSlot && <div className="absolute -end-12 top-0 z-20">{emoteSlot}</div>}

        </div>

        <div className="max-w-full rounded-neo border-[3px] border-neo-cream bg-neo-navy/90 px-3 py-0.5 text-center shadow-hard">
          {nameSlot}
        </div>

        {quickPickSlot}
      </div>

      {/* The crowd: everyone else in the room, counted, their faces popping in as they arrive. */}
      <div className="relative shrink-0 px-3 pb-2">
        <div
          data-testid="waiting-crowd"
          className="mx-auto flex w-full max-w-md items-center gap-2.5 rounded-neo-lg border-[3px] border-neo-cream bg-neo-navy/90 px-2.5 py-2 shadow-hard lg:max-w-2xl lg:px-5"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative art / avatar data URLs: next/image adds nothing */}
          <img
            data-testid="classroom-lobby-mascot"
            src="/images/education/waiting-for-teacher.webp"
            alt=""
            aria-hidden="true"
            className="pointer-events-none size-[clamp(2.75rem,6.5dvh,7rem)] shrink-0 select-none rounded-neo border-[3px] border-neo-cream object-cover shadow-hard-sm motion-safe:animate-[lc-lexi-idle_2.4s_ease-in-out_infinite]"
          />
          <div className="min-w-0 flex-1">
          <p
            data-testid="waiting-for-teacher-line"
            role="status"
            className="flex items-center gap-2 font-neo-display text-xs font-black uppercase leading-tight text-neo-yellow sm:text-base lg:text-2xl"
          >
            <span className="min-w-0 truncate">{tr(t, 'academy.waiting.forTeacher', 'Waiting for your teacher to start')}</span>
            <span aria-hidden="true" className="inline-flex shrink-0 gap-1">
              <span className="size-1.5 rounded-full bg-neo-yellow motion-safe:animate-bounce" />
              <span className="size-1.5 rounded-full bg-neo-yellow motion-safe:animate-bounce [animation-delay:150ms]" />
              <span className="size-1.5 rounded-full bg-neo-yellow motion-safe:animate-bounce [animation-delay:300ms]" />
            </span>
          </p>
          {statusSlot}
          <div className="mt-1 flex items-center gap-2">
            <p className="flex shrink-0 items-baseline gap-1.5 font-neo-display font-black uppercase leading-none text-neo-cream">
              <span
                key={others.length}
                data-testid="waiting-crowd-count"
                className="inline-block text-[clamp(1.1rem,3dvh,3rem)] tabular-nums text-neo-lime motion-safe:animate-[lc-mate-pop_420ms_cubic-bezier(.34,1.56,.64,1)]"
              >
                {others.length}
              </span>
              <span className="text-xs tracking-wide lg:text-2xl">
                {others.length === 1
                  ? tr(t, 'academy.waiting.classmateHere', 'classmate is here')
                  : tr(t, 'academy.waiting.classmatesHere', 'classmates are here')}
              </span>
            </p>
            {shownFaces.length === 0 && (
              <p className="min-w-0 truncate font-neo-body text-xs font-bold text-neo-cream/85 lg:text-lg">
                {tr(t, 'academy.waiting.firstIn', "You're first in! Classmates pop in here.")}
              </p>
            )}
            {shownFaces.length > 0 && (
              <ul
                aria-label={tr(t, 'academy.waiting.classmates', 'Classmates here')}
                className="flex min-w-0 items-center -space-x-1.5 rtl:space-x-reverse"
              >
                {shownFaces.map((mate) => (
                  <li
                    key={mate.username}
                    title={mate.username}
                    className="size-[clamp(1.75rem,4.5dvh,4rem)] shrink-0 overflow-hidden rounded-full border-[3px] border-neo-cream bg-neo-navy shadow-hard-sm motion-safe:animate-[lc-mate-pop_420ms_cubic-bezier(.34,1.56,.64,1)] [&_svg]:h-full [&_svg]:w-full"
                  >
                    <Avatar
                      userId={mate.username}
                      customAvatar={mate.avatar?.customAvatar ?? undefined}
                      size="lg"
                      disableEffects
                      className="!h-full !w-full"
                    />
                  </li>
                ))}
                {hiddenCount > 0 && (
                  <li className="flex size-[clamp(1.75rem,4.5dvh,4rem)] shrink-0 items-center justify-center rounded-full border-[3px] border-neo-black bg-neo-cyan font-neo-display text-xs font-black text-neo-black shadow-hard-sm lg:text-lg">
                    +{hiddenCount}
                  </li>
                )}
              </ul>
            )}
          </div>
          </div>
        </div>
      </div>

      <div
        data-testid="waiting-dock"
        className="relative mx-auto flex w-full max-w-xl shrink-0 flex-col gap-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        {readySlot}
        {instructionsSlot}
      </div>
    </div>
  );
}

export default ClassroomWaitingStage;
