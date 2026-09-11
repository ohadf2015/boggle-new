'use client';

import { memo, useMemo } from 'react';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { chipAccent, chipInitial, chipTilt, rosterDensity } from './projectorLobbyModel';

export interface ProjectorStudent {
  username: string;
  isBot?: boolean;
}

interface ProjectorRosterProps {
  /** Already filtered — the host is the screen, never a name on the wall. */
  students: ProjectorStudent[];
  readyUsernames?: string[];
  t: (path: string, params?: Record<string, string | number>) => string;
}

/**
 * The half of the projector a class actually watches: their own names landing
 * on the wall, one pop at a time, with a live count.
 *
 * Kahoot drifts plain text in. We land a chunky colour-coded chip with an
 * initial tile, a small tilt, and a spring — the arrival is the reward for
 * typing the code, so it should be worth looking up for.
 */
export const ProjectorRoster = memo<ProjectorRosterProps>(function ProjectorRoster({
  students,
  readyUsernames = [],
  t,
}) {
  const reduceMotion = useReducedMotion();
  const readySet = useMemo(() => new Set(readyUsernames), [readyUsernames]);
  const readyCount = students.filter((s) => readySet.has(s.username)).length;
  // Chip size is a function of how full the room is — a class of 32 has to fit
  // on the wall, because nobody scrolls a projector. See `rosterDensity`.
  const density = rosterDensity(students.length);

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-[0.6vw]">
      <header className="flex shrink-0 flex-wrap items-baseline gap-x-4 gap-y-1">
        <span
          data-testid="projector-count"
          className="flex items-baseline gap-[0.4vw] font-neo-display text-[min(9vw,7vh)] font-black leading-none text-neo-lime md:text-[min(5vw,9vh)]"
        >
          <Users className="h-[0.5em] w-[0.5em] shrink-0 self-center" aria-hidden="true" />
          {students.length}
        </span>
        <span className="font-neo-body text-[3.4vw] font-bold uppercase tracking-widest text-neo-cream/80 md:text-[1.3vw]">
          {t('education.projectorLobby.inTheRoom')}
        </span>
        {readyCount > 0 && (
          <span
            data-testid="projector-ready-count"
            className="rounded-full border-2 border-neo-lime bg-neo-lime/15 px-3 py-1 font-neo-body text-[2.4vw] font-bold uppercase tracking-wider text-neo-lime md:text-[0.95vw]"
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
          // whatever the join panel and footer leave — which was once ~50px for
          // ~50px of copy, and the hint rendered straight through the dashed
          // border. `min-h-0` lets the box shrink, `overflow-hidden` makes it
          // clip its own content instead of spilling, and the `vh` ceilings
          // below shrink the words first so it rarely has to.
          className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[0.5vh] overflow-hidden rounded-neo border-4 border-dashed border-neo-cream/25 px-4 py-[1vh] text-center"
        >
          <p
            data-testid="projector-roster-empty-title"
            className="font-neo-display text-[min(4.4vw,4.5vh)] font-black uppercase leading-tight text-neo-cream md:text-[min(2vw,4vh)]"
          >
            {t('education.projectorLobby.nobodyYet')}
          </p>
          <p className="font-neo-body text-[min(3vw,3vh)] leading-tight text-neo-cream/70 md:text-[min(1.1vw,2.4vh)]">
            {t('education.projectorLobby.nobodyYetHint')}
          </p>
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
                  initial={reduceMotion ? { scale: 1, opacity: 1, rotate: 0 } : { scale: 0.2, opacity: 0, rotate: -14 }}
                  animate={{ scale: 1, opacity: 1, rotate: chipTilt(student.username, index) }}
                  exit={reduceMotion ? undefined : { scale: 0.6, opacity: 0 }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 520, damping: 16, mass: 0.7 }
                  }
                  className={cn(
                    'flex max-w-full items-center rounded-neo shadow-hard',
                    'font-neo-display font-black leading-none',
                    density.chip,
                    chipAccent(student.username, index)
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="inline-flex h-[1.5em] w-[1.5em] shrink-0 items-center justify-center rounded-full border-2 border-neo-black bg-neo-navy text-neo-cream"
                  >
                    {chipInitial(student.username)}
                  </span>
                  <span className="truncate">{student.username}</span>
                  {isReady && <Check className="h-[1em] w-[1em] shrink-0" aria-hidden="true" />}
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
