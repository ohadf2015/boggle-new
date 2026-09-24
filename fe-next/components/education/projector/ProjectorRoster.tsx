'use client';

import { memo, useEffect, useMemo, useRef } from 'react';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check, Users } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { Avatar as AvatarType } from '@/shared/types/game';
import { cn } from '@/lib/utils';
import { tr } from '@/components/education/lobby/eduText';
import { arrivalsSince, chipAccent, chipTilt, rosterDensity } from './projectorLobbyModel';

export interface ProjectorStudent {
  username: string;
  isBot?: boolean;
  /** The student's stored avatar, when the room carries it. Absent → a face seeded from the name. */
  avatar?: AvatarType | null;
}

interface ProjectorRosterProps {
  /** Already filtered — the host is the screen, never a name on the wall. */
  students: ProjectorStudent[];
  readyUsernames?: string[];
  t: (path: string, params?: Record<string, string | number>) => string;
}

/**
 * The half of the projector a class actually watches: their own FACES landing
 * on the arena floor, one pop at a time, with a count that bumps every time.
 *
 * Each arrival is a chunky colour-coded chip with the student's avatar, a small
 * tilt and a spring, plus the join sting — the arrival is the reward for typing
 * the code, so it should be worth looking up for. The sting fires only for a
 * name that was not there on the previous render (`arrivalsSince`), so a
 * reconnecting projector does not play thirty stings at once.
 */
export const ProjectorRoster = memo<ProjectorRosterProps>(function ProjectorRoster({
  students,
  readyUsernames = [],
  t,
}) {
  const reduceMotion = useReducedMotion();
  const { playPlayerJoinedSound } = useSoundEffects();
  const readySet = useMemo(() => new Set(readyUsernames), [readyUsernames]);
  const readyCount = students.filter((s) => readySet.has(s.username)).length;
  // Chip size is a function of how full the room is — a class of 32 has to fit
  // on the wall, because nobody scrolls a projector. See `rosterDensity`.
  const density = rosterDensity(students.length);

  const names = useMemo(() => students.map((s) => s.username), [students]);
  const previousNames = useRef<string[] | null>(null);
  useEffect(() => {
    const arrived = arrivalsSince(previousNames.current, names);
    previousNames.current = names;
    if (arrived.length > 0) playPlayerJoinedSound?.();
  }, [names, playPlayerJoinedSound]);

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-[0.6vw]">
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-[0.6vw] rounded-neo-lg border-3 border-neo-cream bg-neo-navy/90 px-[1.2vw] py-[0.2vw] shadow-hard">
          <Users className="h-[min(7vw,5vh)] w-[min(7vw,5vh)] shrink-0 text-neo-lime md:h-[min(3vw,5vh)] md:w-[min(3vw,5vh)]" aria-hidden="true" />
          <m.span
            key={students.length}
            data-testid="projector-count"
            initial={reduceMotion ? false : { scale: 1.6, rotate: -6 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 14 }}
            className="inline-block font-neo-display text-[min(9vw,7vh)] font-black leading-none tabular-nums text-neo-lime md:text-[min(4vw,7vh)]"
          >
            {students.length}
          </m.span>
          <span
            data-testid="projector-count-label"
            className="font-neo-display text-[min(4.4vw,3.4vh)] font-black uppercase tracking-wide text-neo-cream md:text-[min(2vw,3.6vh)]"
          >
            {tr(t, 'academy.projector.joined', 'joined')}
          </span>
        </span>
        {/* Readiness sits WITH the faces it counts: "N / M ready" as a bar
            that fills as tiles light up below it. */}
        {students.length > 0 && (
          <div
            data-testid="projector-ready-count"
            role="progressbar"
            aria-valuenow={readyCount}
            aria-valuemin={0}
            aria-valuemax={students.length}
            aria-label={t('education.projectorLobby.readyCount', { ready: readyCount, total: students.length })}
            className="flex min-w-0 flex-1 items-center gap-[1vw] rounded-neo-lg border-3 border-neo-cream bg-neo-navy/90 px-[1vw] py-[0.5vw] shadow-hard md:max-w-[36vw]"
          >
            <span className="shrink-0 font-neo-display text-[3.4vw] font-black uppercase leading-none tracking-wide text-neo-lime tabular-nums md:text-[min(1.6vw,3vh)]">
              {t('education.projectorLobby.readyCount', { ready: readyCount, total: students.length })}
            </span>
            <span className="relative h-[2.2vw] min-w-0 flex-1 overflow-hidden rounded-full border-[3px] border-neo-cream bg-neo-navy md:h-[min(1.4vw,2.6vh)]">
              <span
                data-testid="projector-ready-fill"
                className="absolute inset-y-0 start-0 rounded-full bg-neo-lime transition-[width] duration-500 ease-out motion-reduce:transition-none"
                style={{ width: `${Math.round((readyCount / students.length) * 100)}%` }}
              />
            </span>
          </div>
        )}
      </header>

      {students.length === 0 ? (
        <div
          data-testid="projector-roster-empty"
          // The roster is the only flexible row in a `fixed inset-0
          // overflow-hidden` column, so on a short laptop window it is handed
          // whatever the join panel and footer leave. `min-h-0` lets the box
          // shrink, `overflow-hidden` makes it clip its own content instead of
          // spilling, and the `vh` ceilings shrink the words first.
          className="flex min-h-0 flex-1 items-center justify-center gap-[2vw] overflow-hidden rounded-neo-lg border-4 border-dashed border-neo-cream/50 bg-neo-navy/70 px-4 py-[1vh] text-center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative art / avatar data URLs: next/image adds nothing */}
          <img
            src="/images/education/share-code.webp"
            alt=""
            aria-hidden="true"
            className="hidden h-[min(18vh,10vw)] w-auto shrink-0 select-none object-contain motion-safe:animate-avatar-float md:block"
          />
          <div className="flex min-w-0 flex-col gap-[0.5vh]">
            <p
              data-testid="projector-roster-empty-title"
              className="font-neo-display text-[min(4.4vw,4.5vh)] font-black uppercase leading-tight text-neo-cream md:text-[min(2vw,4vh)]"
            >
              {t('education.projectorLobby.nobodyYet')}
            </p>
            <p className="font-neo-body text-[min(3vw,3vh)] leading-tight text-neo-cream/80 md:text-[min(1.1vw,2.4vh)]">
              {t('education.projectorLobby.nobodyYetHint')}
            </p>
          </div>
        </div>
      ) : (
        <ul
          data-testid="projector-roster-list"
          className={cn(
            // Top/end padding so a ready tile's corner check is never clipped by the list.
            'flex min-h-0 flex-1 flex-wrap content-start overflow-y-auto pe-3 pt-3',
            density.gap
          )}
        >
          <AnimatePresence initial={false}>
            {students.map((student, index) => {
              const isReady = readySet.has(student.username);
              // Once anyone is ready, the tiles still waiting step back so the
              // room's holdouts read at a glance. Before that, nobody is dimmed:
              // an arrival is still the reward for typing the code.
              const dim = readyCount > 0 && !isReady;
              return (
                <m.li
                  key={student.username}
                  data-testid="projector-student"
                  data-ready={isReady ? 'true' : 'false'}
                  data-glow={isReady ? 'true' : 'false'}
                  data-dim={dim ? 'true' : 'false'}
                  initial={reduceMotion ? { scale: 1, rotate: 0, y: 0 } : { scale: 0.2, rotate: -14, y: -40 }}
                  animate={{ scale: 1, rotate: chipTilt(student.username, index), y: 0 }}
                  exit={reduceMotion ? undefined : { scale: 0.4 }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 520, damping: 14, mass: 0.7 }
                  }
                  className={cn(
                    'relative flex max-w-full items-center rounded-neo',
                    'font-neo-display font-black leading-none',
                    'transition-[filter,box-shadow] duration-300 motion-reduce:transition-none',
                    isReady
                      ? 'shadow-[0_0_0_3px_#bfff00,0_0_1.4em_0.2em_rgba(191,255,0,0.75),4px_4px_0_#000]'
                      : 'shadow-hard',
                    dim && 'brightness-[0.62] saturate-[0.55]',
                    density.chip,
                    chipAccent(student.username, index)
                  )}
                >
                  <span
                    data-testid="projector-avatar"
                    aria-hidden="true"
                    className="relative inline-flex h-[1.5em] w-[1.5em] shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-neo-cream bg-neo-navy [&_svg]:h-full [&_svg]:w-full"
                  >
                    <Avatar
                      userId={student.username}
                      customAvatar={student.avatar?.customAvatar ?? undefined}
                      size="xl"
                      disableEffects
                      className="!h-full !w-full"
                    />
                  </span>
                  <span className="truncate">{student.username}</span>
                  {isReady && (
                    <span
                      data-testid="projector-ready-check"
                      aria-hidden="true"
                      className="absolute -end-[0.45em] -top-[0.45em] grid h-[0.95em] w-[0.95em] place-items-center rounded-full border-[3px] border-neo-black bg-neo-lime text-neo-black shadow-hard-sm"
                    >
                      <Check className="h-[0.6em] w-[0.6em]" strokeWidth={5} />
                    </span>
                  )}
                  {isReady && <span className="sr-only">{tr(t, 'academy.projector.ready', 'ready')}</span>}
                </m.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
});

export default ProjectorRoster;
