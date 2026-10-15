'use client';

import { Check, Users } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { cn } from '@/lib/utils';
import { chipAccent } from '@/components/education/projector/projectorLobbyModel';
import type { ProjectorStudent } from '@/components/education/projector/ProjectorRoster';
import type { Translate } from './eduLiveStyles';

/** Seats the wall can show at 3 columns before it says "+N more" instead of shrinking names. */
const MAX_VISIBLE = 24;

interface EduLobbyRosterProps {
  students: ProjectorStudent[];
  readyUsernames: string[];
  t: Translate;
}

export function EduLobbyRoster({ students, readyUsernames, t }: EduLobbyRosterProps) {
  const ready = new Set(readyUsernames);
  const visible = students.slice(0, MAX_VISIBLE);
  const hidden = students.length - visible.length;

  return (
    <section
      data-testid="edu-lobby-roster"
      className="flex min-h-0 flex-1 flex-col gap-3 rounded-neo-lg border-4 border-neo-cream bg-neo-navy/95 p-3 shadow-hard-lg md:gap-[0.8vw] md:p-[1vw]"
    >
      <header className="flex items-center justify-between gap-3">
        <h2 data-testid="edu-lobby-count" className="inline-flex items-center gap-2 font-neo-display text-2xl font-black text-neo-cream md:text-[2vw]">
          <Users className="size-7 text-neo-lime md:size-[2vw]" aria-hidden="true" />
          {t('eduLiveRoom.lobby.joined', { count: students.length })}
        </h2>
        {ready.size > 0 && (
          <span className="rounded-full border-2 border-neo-cream/50 px-3 py-0.5 font-neo-body text-sm font-bold text-neo-cream/85 md:text-[0.95vw]">
            {t('eduLiveRoom.lobby.readyCount', { ready: students.filter((s) => ready.has(s.username)).length, total: students.length })}
          </span>
        )}
      </header>

      {students.length === 0 ? (
        <div data-testid="edu-lobby-empty" className="grid min-h-0 flex-1 place-items-center rounded-neo border-[3px] border-dashed border-neo-cream/40 p-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <p className="font-neo-display text-2xl font-black text-neo-cream md:text-[2vw]">{t('eduLiveRoom.lobby.waitingTitle')}</p>
            <p className="max-w-[34ch] font-neo-body text-base font-bold text-neo-cream/75 md:text-[1.1vw]">{t('eduLiveRoom.lobby.waitingHint')}</p>
          </div>
        </div>
      ) : (
        <ul className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 content-start gap-2 overflow-hidden sm:grid-cols-3 md:gap-[0.7vw]">
          {visible.map((student, index) => (
            <li
              key={student.username}
              data-testid="edu-lobby-student"
              className={cn(
                'relative flex min-w-0 items-center gap-2 rounded-full border-[3px] py-1 pe-3 ps-1 shadow-hard-sm motion-safe:animate-[edu-live-pop_220ms_cubic-bezier(0.23,1,0.32,1)_both]',
                'font-neo-display text-lg font-black md:py-[0.3vw] md:pe-[0.9vw] md:text-[1.45vw]',
                chipAccent(student.username, index)
              )}
            >
              <span aria-hidden="true" className="inline-flex size-10 shrink-0 overflow-hidden rounded-full border-[3px] border-neo-black bg-neo-cream md:size-[3vw]">
                <Avatar userId={student.username} customAvatar={student.avatar?.customAvatar ?? undefined} size="xl" disableEffects className="!h-full !w-full" />
              </span>
              <span dir="auto" className="truncate">{student.username}</span>
              {ready.has(student.username) && (
                <span aria-hidden="true" className="absolute -end-1 -top-1 grid size-5 place-items-center rounded-full border-2 border-neo-black bg-neo-white text-neo-black">
                  <Check className="size-3" strokeWidth={4} />
                </span>
              )}
            </li>
          ))}
          {hidden > 0 && (
            <li className="grid place-items-center rounded-full border-[3px] border-neo-cream/50 font-neo-display text-lg font-black text-neo-cream md:text-[1.3vw]">
              {t('eduLiveRoom.lobby.moreJoined', { count: hidden })}
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

export default EduLobbyRoster;
