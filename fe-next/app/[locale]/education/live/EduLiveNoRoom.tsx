'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { EDU_MASCOT } from '@/lib/education/mascotArt';
import { classroomStudentHomePath } from '@/lib/education/classroomRoomGone';
import { LIVE_KEYFRAMES, PRESS, PRIMARY_BUTTON, type Translate } from '@/components/education/live/eduLiveStyles';

interface EduLiveNoRoomProps {
  isHost: boolean;
  language: string;
  t: Translate;
}

/** A stage, not a lone card: the mascot says what happened and the one way forward sits under the thumb. */
export function EduLiveNoRoom({ isHost, language, t }: EduLiveNoRoomProps) {
  const primaryHref = isHost ? `/${language}/teacher` : `/${language}/join`;
  const secondaryHref = isHost ? `/${language}/education/classroom-game` : classroomStudentHomePath(language);

  return (
    <div data-testid="edu-live-no-room" className="relative flex min-h-[calc(100dvh-1rem)] flex-1 flex-col overflow-hidden bg-neo-navy text-neo-cream">
      <style>{LIVE_KEYFRAMES}</style>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,var(--neo-navy-light)_0,transparent_62%)]" />

      <main className="relative mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col items-center justify-center gap-5 px-4 pt-10 text-center tv:max-w-2xl">
        <div
          data-testid="edu-live-no-room-bubble"
          className="relative max-w-[18rem] rounded-neo-lg border-4 border-neo-black bg-neo-cream px-5 py-3 text-neo-black shadow-hard motion-safe:animate-[edu-live-bob_3.2s_ease-in-out_infinite] tv:max-w-md tv:px-8 tv:py-5"
        >
          <h1 className="font-neo-display text-2xl font-black leading-tight tv:text-4xl">{t('eduLiveRoom.entry.noRoomTitle')}</h1>
          <svg aria-hidden="true" viewBox="0 0 24 14" className="absolute left-[calc(50%-12px)] top-[calc(100%-4px)] h-[14px] w-6 fill-neo-cream stroke-neo-black">
            <path d="M1 0 L12 12 L23 0" strokeWidth="4" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="relative flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- mascot art map path, decorative */}
          <img
            src={isHost ? EDU_MASCOT.empty : EDU_MASCOT.scanJoin}
            alt=""
            aria-hidden="true"
            className="relative z-10 size-[min(13rem,30dvh)] select-none object-contain motion-safe:animate-[edu-live-bob_2.4s_ease-in-out_infinite] tv:size-[min(20rem,34dvh)]"
          />
          <span aria-hidden="true" className="-mt-5 h-6 w-40 rounded-[50%] bg-neo-navy-light tv:w-60" />
        </div>

        <p className="max-w-xs font-neo-body text-lg font-bold text-neo-cream/85 tv:max-w-lg tv:text-2xl">
          {t(isHost ? 'eduLiveRoom.entry.noRoomHost' : 'eduLiveRoom.entry.noRoomStudent')}
        </p>
      </main>

      <footer className="relative mx-auto flex w-full max-w-md flex-col items-center gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 tv:max-w-xl">
        <Link href={primaryHref} data-testid="edu-live-no-room-cta" className={cn(PRIMARY_BUTTON, PRESS, 'min-h-14 w-full px-5 text-xl tv:min-h-16 tv:text-2xl')}>
          {t(isHost ? 'eduLiveRoom.entry.toTeacher' : 'eduLiveRoom.entry.enterCode')}
        </Link>
        <Link
          href={secondaryHref}
          data-testid="edu-live-no-room-secondary"
          className="inline-flex min-h-11 items-center rounded-neo px-3 font-neo-display text-base font-bold text-neo-cyan underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
        >
          {t(isHost ? 'eduLiveRoom.entry.pickGame' : 'eduLiveRoom.entry.soloPractice')}
        </Link>
      </footer>
    </div>
  );
}

export default EduLiveNoRoom;
