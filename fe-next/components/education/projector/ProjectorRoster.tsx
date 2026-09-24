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
        {readyCount > 0 && (
          <span
            data-testid="projector-ready-count"
            className="rounded-full border-3 border-neo-black bg-neo-lime px-3 py-1 font-neo-body text-[2.4vw] font-black uppercase tracking-wider text-neo-black shadow-hard-sm md:text-[0.95vw]"
          >
            {t('education.projectorLobby.readyCount', { ready: readyCount, total: students.length })}
          </span>
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
            'flex min-h-0 flex-1 flex-wrap content-start overflow-y-auto',
            density.gap
          )}
        >
          <AnimatePresence initial={false}>
            {students.map((student, index) => {
              const isReady = readySet.has(student.username);
              return (
                <m.li
                  key={student.username}
                  data-testid="projector-student"
                  data-ready={isReady ? 'true' : 'false'}
                  initial={reduceMotion ? { scale: 1, rotate: 0, y: 0 } : { scale: 0.2, rotate: -14, y: -40 }}
                  animate={{ scale: 1, rotate: chipTilt(student.username, index), y: 0 }}
                  exit={reduceMotion ? undefined : { scale: 0.4 }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 520, damping: 14, mass: 0.7 }
                  }
                  className={cn(
                    'flex max-w-full items-center rounded-neo shadow-hard',
                    'font-neo-display font-black leading-none',
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
                  {isReady && <Check className="h-[1em] w-[1em] shrink-0" strokeWidth={4} aria-hidden="true" />}
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
