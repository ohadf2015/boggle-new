'use client';

import type { ReactNode } from 'react';
import Avatar from '@/components/Avatar';
import type { WaitingClassmate } from '@/components/education/lobby/ClassroomWaitingStage';
import type { EduT } from '@/components/education/lobby/eduText';
import { EDU_MASCOT } from '@/lib/education/mascotArt';

const MAX_FACES = 8;
const CHIP = 'size-9 shrink-0 overflow-hidden rounded-full border-[3px] border-neo-cream bg-neo-navy shadow-hard-sm';

export function EduStudentLobbyCrowd({ others, statusSlot, t }: { others: WaitingClassmate[]; statusSlot?: ReactNode; t: EduT }) {
  const faces = others.slice(0, MAX_FACES);
  const hidden = others.length - faces.length;

  return (
    <section
      data-testid="edu-student-crowd"
      className="flex w-full max-w-sm items-center gap-3 rounded-neo-lg border-[3px] border-neo-cream bg-neo-navy-light p-2.5 shadow-hard"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- mascot art map path, decorative */}
      <img src={EDU_MASCOT.gameStart} alt="" aria-hidden="true" className="size-14 shrink-0 select-none motion-safe:animate-[edu-live-bob_2.4s_ease-in-out_infinite]" />
      <div className="min-w-0 flex-1">
        <p role="status" className="font-neo-body text-sm font-bold leading-snug text-neo-cream">
          {t('eduLiveRoom.student.watchBoard')}
        </p>
        {statusSlot}
        {faces.length === 0 ? (
          <p className="mt-1 font-neo-body text-xs font-bold text-neo-cream/80">{t('academy.waiting.firstIn')}</p>
        ) : (
          <ul aria-label={t('academy.waiting.classmates')} className="mt-1.5 flex min-w-0 items-center -space-x-1.5 rtl:space-x-reverse">
            {faces.map((mate) => (
              <li
                key={mate.username}
                data-testid="edu-student-mate"
                title={mate.username}
                className={`${CHIP} motion-safe:animate-[edu-live-pop_320ms_cubic-bezier(0.34,1.56,0.64,1)_both] [&_svg]:h-full [&_svg]:w-full`}
              >
                <Avatar userId={mate.username} customAvatar={mate.avatar?.customAvatar ?? undefined} size="lg" disableEffects className="!h-full !w-full" />
              </li>
            ))}
            {hidden > 0 && (
              <li
                data-testid="edu-student-mates-more"
                dir="ltr"
                className={`${CHIP} grid place-items-center border-neo-black bg-neo-cyan font-neo-display text-xs font-black text-neo-black`}
              >
                +{hidden}
              </li>
            )}
          </ul>
        )}
      </div>
    </section>
  );
}
