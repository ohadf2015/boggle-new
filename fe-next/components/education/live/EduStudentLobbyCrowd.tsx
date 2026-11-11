'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Avatar from '@/components/Avatar';
import type { WaitingClassmate } from '@/components/education/lobby/ClassroomWaitingStage';
import type { EduT } from '@/components/education/lobby/eduText';
import { EDU_MASCOT } from '@/lib/education/mascotArt';
import { cn } from '@/lib/utils';
import { newArrivals } from './lobbyArrivals';

const MAX_FACES = 11;
const ROW = 4;
const ARRIVAL_MS = 2600;
const FACE = 'grid size-12 place-items-center overflow-hidden rounded-full border-[3px] shadow-hard-sm';

function useArrivals(names: string[]): { latest: string | null; fresh: ReadonlySet<string> } {
  const prev = useRef<string[] | null>(null);
  const [state, setState] = useState<{ latest: string | null; fresh: ReadonlySet<string> }>({ latest: null, fresh: new Set() });
  const key = names.join('\u0000');

  useEffect(() => {
    const now = key ? key.split('\u0000') : [];
    const joined = newArrivals(prev.current, now);
    prev.current = now;
    if (joined.length === 0) return undefined;
    setState({ latest: joined[joined.length - 1], fresh: new Set(joined) });
    const timer = window.setTimeout(() => setState({ latest: null, fresh: new Set() }), ARRIVAL_MS);
    return () => window.clearTimeout(timer);
  }, [key]);

  return state;
}

/** Classmates wall: everyone waiting, each arrival pops in with a bounce and a "Noa joined!" line. */
export function EduStudentLobbyCrowd({ others, statusSlot, t }: { others: WaitingClassmate[]; statusSlot?: ReactNode; t: EduT }) {
  const faces = others.slice(0, MAX_FACES);
  const hidden = others.length - faces.length;
  const seats = hidden > 0 ? 0 : faces.length === 0 ? ROW : (ROW - (faces.length % ROW)) % ROW;
  const { latest, fresh } = useArrivals(others.map((o) => o.username));

  return (
    <section
      data-testid="edu-student-crowd"
      className="flex w-full max-w-md shrink-0 flex-col gap-2.5 rounded-neo-lg border-[3px] border-neo-cream bg-neo-navy-light p-3 shadow-hard"
    >
      <div className="flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element -- mascot art map path, decorative */}
        <img src={EDU_MASCOT.gameStart} alt="" aria-hidden="true" className="size-11 shrink-0 select-none motion-safe:animate-[edu-live-bob_2.4s_ease-in-out_infinite]" />
        <p role="status" className="min-w-0 flex-1 font-neo-body text-sm font-bold leading-snug text-neo-cream">
          {t('eduLiveRoom.student.watchBoard')}
        </p>
      </div>
      {statusSlot}
      <p aria-live="polite" className="empty:-mt-2.5">
        {latest && (
          <span
            key={latest}
            data-testid="edu-student-arrival"
            className="inline-flex max-w-full items-center rounded-full border-2 border-neo-black bg-neo-lime px-3 py-0.5 font-neo-display text-sm font-black text-neo-black shadow-hard-sm [overflow-wrap:anywhere] motion-safe:animate-[edu-live-pop_320ms_cubic-bezier(0.34,1.56,0.64,1)_both]"
          >
            <bdi>{t('eduLiveRoom.student.joined', { name: latest })}</bdi>
          </span>
        )}
      </p>
      {faces.length === 0 && <p className="font-neo-body text-sm font-bold text-neo-cream/80">{t('academy.waiting.firstIn')}</p>}
      <ul aria-label={t('academy.waiting.classmates')} className="grid grid-cols-4 content-start gap-x-2 gap-y-3">
        {faces.map((mate) => {
          const isNew = fresh.has(mate.username);
          return (
            <li
              key={mate.username}
              data-testid="edu-student-mate"
              data-new={isNew ? 'true' : undefined}
              className="flex min-w-0 flex-col items-center gap-1 motion-safe:animate-[edu-live-pop_360ms_cubic-bezier(0.34,1.56,0.64,1)_both]"
            >
              <span className={cn(FACE, 'relative bg-neo-navy [&_svg]:h-full [&_svg]:w-full', isNew ? 'border-neo-lime ring-4 ring-neo-lime/40' : 'border-neo-cream')}>
                <span data-testid="edu-student-mate-initial" aria-hidden="true" className="absolute inset-0 grid place-items-center font-neo-display text-lg font-black uppercase text-neo-cream">
                  {Array.from(mate.username.trim())[0] ?? '?'}
                </span>
                <span className="relative size-full">
                  <Avatar userId={mate.username} customAvatar={mate.avatar?.customAvatar ?? undefined} size="lg" disableEffects className="!h-full !w-full" />
                </span>
              </span>
              <bdi className="w-full text-center font-neo-body text-[11px] font-bold leading-tight text-neo-cream [overflow-wrap:anywhere]">{mate.username}</bdi>
            </li>
          );
        })}
        {Array.from({ length: seats }, (_, i) => (
          <li key={`seat-${i}`} data-testid="edu-student-seat" aria-hidden="true" className="flex flex-col items-center">
            <span className={cn(FACE, 'border-dashed border-neo-cream/25 shadow-none')} />
          </li>
        ))}
        {hidden > 0 && (
          <li className="flex flex-col items-center">
            <span data-testid="edu-student-mates-more" dir="ltr" className={cn(FACE, 'border-neo-black bg-neo-cyan font-neo-display text-sm font-black text-neo-black')}>
              +{hidden}
            </span>
          </li>
        )}
      </ul>
    </section>
  );
}
