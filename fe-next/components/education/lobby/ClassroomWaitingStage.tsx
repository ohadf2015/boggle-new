/**
 * ClassroomWaitingStage — what a student sees between typing the code and the
 * teacher pressing Start.
 *
 * It used to be the public multiplayer lobby with the recruiting kit removed: a
 * settings card, a "2/8" counter and a hero card — a form to wait on. Median
 * student session is 35 seconds; the wait is a real share of it. So the wait is
 * now the first moment of the game: the SAME arena the projector shows, the
 * student's own face in the spotlight (tap it to dress up), Lexi waiting with
 * them, classmates' faces arriving along the rail, and one line — "waiting for
 * your teacher" — with bouncing dots so it reads as alive, not frozen.
 *
 * Round 2 (2026-09-24): on a phone more than half of this was empty sky. The
 * top of the stage now carries a pulsing "Get ready!" and a warm-up tap game
 * built from the student's own name (`WaitingWarmUp`), Lexi idles beside the
 * student, and classmates POP onto the rail as they arrive.
 *
 * Motion is CSS only (`motion-safe:`), transform-based, and nothing fades in
 * from zero (Class 5). Dark-only: `bg-neo-navy` hardcoded. It sits UNDER the
 * page's EducationHeader + class banner, so it is `flex-1 min-h-0`, never
 * `h-dvh`/`fixed`, and it never scrolls: the how-to-play is a collapsed slot.
 * The parent (PlayerWaitingView) keeps the avatar builder, the exit dialog and
 * the ready/emote/name controls, and hands them in as slots.
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
  '@keyframes lc-lexi-idle{0%,100%{transform:rotate(-3deg) translateY(0)}50%{transform:rotate(2deg) translateY(-6px)}}';

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
  /** Collapsed how-to-play for board modes; nothing for a quiz. */
  instructionsSlot?: ReactNode;
  /** Everyone in the room except the teacher (the student may be in it). */
  classmates: WaitingClassmate[];
  onExit: () => void;
  t: EduT;
}

const MAX_FACES = 7;

export function ClassroomWaitingStage({
  username,
  avatar,
  onEditAvatar,
  nameSlot,
  readySlot,
  statusSlot,
  emoteSlot,
  instructionsSlot,
  classmates,
  onExit,
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
      <img
        data-testid="waiting-stage-art"
        src="/images/education/arena-lobby-bg.webp"
        alt=""
        aria-hidden="true"
        loading="eager"
        decoding="async"
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-bottom"
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-neo-navy/40" />
      <style>{STAGE_KEYFRAMES}</style>

      {/* Top rail: how many are in, and the way out. */}
      <div className="relative flex shrink-0 items-center justify-between gap-2 px-3 pt-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border-[3px] border-neo-cream bg-neo-navy/90 px-3 py-1 shadow-hard-sm">
          <Users className="size-4 text-neo-cyan" aria-hidden="true" />
          <span data-testid="classroom-waiting-count" className="font-neo-display text-base font-black tabular-nums text-neo-cream">
            {classmates.length}
          </span>
          <span className="font-neo-body text-xs font-bold uppercase tracking-wide text-neo-cream/85">
            {tr(t, 'academy.waiting.inClass', 'in class')}
          </span>
        </span>
        <button
          type="button"
          onClick={onExit}
          aria-label={t('common.exit')}
          className="flex size-9 items-center justify-center rounded border-2 border-neo-black bg-neo-red text-neo-black shadow-hard-sm transition-all active:translate-y-0.5 active:shadow-none"
        >
          <LogOut className="size-4 text-neo-black rtl:scale-x-[-1]" aria-hidden="true" />
        </button>
      </div>

      {/* The sky is no longer empty: the call to get ready, and something for
          thumbs to do while the teacher sets up. */}
      <div className="relative flex shrink-0 flex-col items-center gap-2 px-3 pt-2 lg:gap-3 lg:pt-4">
        <p
          data-testid="waiting-get-ready"
          className="-rotate-2 rounded-neo border-[3px] border-neo-black bg-neo-yellow px-4 py-1 font-neo-display text-3xl font-black uppercase leading-none tracking-tight text-neo-black shadow-hard-lg motion-safe:animate-[lc-ready-pulse_1.6s_ease-in-out_infinite] lg:text-5xl"
        >
          {tr(t, 'academy.live.getReady', 'Get ready!')}
        </p>
        <WaitingWarmUp username={username} t={t} />
      </div>

      {/* The spotlight: me, on the arena floor, with Lexi. */}
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-3 pb-2 lg:gap-4">
        <div className="relative flex items-end justify-center gap-2">
          <button
            type="button"
            data-testid="edit-avatar-button"
            onClick={onEditAvatar}
            aria-label={tr(t, 'academy.waiting.editAvatar', 'Change your avatar')}
            className="group relative shrink-0 rounded-full border-[3px] border-neo-lime bg-neo-navy p-1 shadow-hard-lg motion-safe:animate-avatar-float"
          >
            <span className="block size-28 overflow-hidden rounded-full border-[3px] border-neo-cream sm:size-36 lg:size-48 [&_svg]:h-full [&_svg]:w-full">
              {avatar}
            </span>
            <span className="absolute -bottom-1 end-1 flex size-8 items-center justify-center rounded-full border-2 border-neo-black bg-neo-cyan shadow-hard-sm">
              <Pencil className="size-4 text-neo-black" aria-hidden="true" />
            </span>
          </button>
          <img
            data-testid="classroom-lobby-mascot"
            src="/images/education/waiting-for-teacher.webp"
            alt=""
            aria-hidden="true"
            className="pointer-events-none h-20 w-auto select-none rounded-neo border-[3px] border-neo-cream object-contain shadow-hard sm:h-24 lg:h-36 motion-safe:animate-[lc-lexi-idle_2.4s_ease-in-out_infinite]"
          />
        </div>

        <div className="max-w-full rounded-neo border-[3px] border-neo-cream bg-neo-navy/90 px-3 py-1 text-center shadow-hard">
          {nameSlot}
        </div>

        <p
          data-testid="waiting-for-teacher-line"
          role="status"
          className="flex items-center gap-2 rounded-full border-[3px] border-neo-black bg-neo-yellow px-4 py-1.5 text-center font-neo-display text-sm font-black uppercase leading-tight text-neo-black shadow-hard sm:text-base lg:text-2xl"
        >
          {tr(t, 'academy.waiting.forTeacher', 'Waiting for your teacher to start')}
          <span aria-hidden="true" className="inline-flex gap-1">
            <span className="size-1.5 rounded-full bg-neo-black motion-safe:animate-bounce" />
            <span className="size-1.5 rounded-full bg-neo-black motion-safe:animate-bounce [animation-delay:150ms]" />
            <span className="size-1.5 rounded-full bg-neo-black motion-safe:animate-bounce [animation-delay:300ms]" />
          </span>
        </p>
        {statusSlot}

        {/* Classmates along the rail — their faces, not a list. */}
        {shownFaces.length > 0 && (
          <ul
            aria-label={tr(t, 'academy.waiting.classmates', 'Classmates here')}
            className="flex max-w-full items-center justify-center -space-x-2"
          >
            {shownFaces.map((mate) => (
              <li
                key={mate.username}
                title={mate.username}
                // Each face POPS in as the classmate arrives (keyed by name, so
                // only the newcomer animates). Transform-only, motion-safe.
                className="size-10 overflow-hidden rounded-full border-[3px] border-neo-cream bg-neo-navy shadow-hard-sm motion-safe:animate-[lc-mate-pop_420ms_cubic-bezier(.34,1.56,.64,1)] lg:size-12 [&_svg]:h-full [&_svg]:w-full"
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
              <li className="flex size-10 items-center justify-center rounded-full border-[3px] border-neo-black bg-neo-cyan font-neo-display text-sm font-black text-neo-black shadow-hard-sm lg:size-12">
                +{hiddenCount}
              </li>
            )}
          </ul>
        )}
      </div>

      {/* Bottom dock: the things a waiting student can DO. */}
      <div className={cn('relative flex shrink-0 flex-col gap-2 px-3 pb-3', 'mx-auto w-full max-w-xl')}>
        {readySlot}
        {emoteSlot && <div className="flex justify-center">{emoteSlot}</div>}
        {instructionsSlot}
      </div>
    </div>
  );
}

export default ClassroomWaitingStage;
