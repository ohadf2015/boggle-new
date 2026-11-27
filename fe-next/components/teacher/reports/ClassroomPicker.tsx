'use client';

import { m, useReducedMotion } from 'framer-motion';
import { ChevronRight, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { classBadge } from '@/components/teacher/home/HomeClassList';

interface PickerClass {
  id: string;
  name: string;
  member_count?: number;
}

// Full class strings so Tailwind can see them; order matches the home class list.
const ACCENTS = [
  { tile: 'bg-neo-purple text-black' },
  { tile: 'bg-neo-cyan text-black' },
  { tile: 'bg-neo-pink text-black' },
  { tile: 'bg-neo-yellow text-black' },
] as const;

export const accentFor = (i: number) => ACCENTS[i % ACCENTS.length];

const SPRING = { type: 'spring', stiffness: 380, damping: 26 } as const;

function StudentCount({ count }: { count: number }) {
  const { t } = useLanguage();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-edu-line bg-edu-tile px-2.5 py-0.5 text-sm font-bold text-edu-ink tabular-nums">
      <Users aria-hidden="true" className="size-4" />
      <span className="sr-only">{t('teacher.reports.metrics.totalStudents')}: </span>
      {count}
    </span>
  );
}

export function ClassroomPicker({
  classrooms,
  onSelect,
  shownId,
}: {
  classrooms: readonly PickerClass[];
  onSelect: (id: string) => void;
  /** The class whose report leads the page above; its tile is marked. */
  shownId?: string | null;
}) {
  const { t } = useLanguage();
  const reduce = useReducedMotion();
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {classrooms.map((c, i) => {
        const accent = accentFor(i);
        const shown = c.id === shownId;
        return (
          <m.li
            key={c.id}
            initial={reduce ? false : { opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ ...SPRING, delay: reduce ? 0 : Math.min(i, 8) * 0.06 }}
          >
            <m.button
              type="button"
              onClick={() => onSelect(c.id)}
              aria-current={shown ? 'true' : undefined}
              whileHover={reduce ? undefined : { y: -4, rotate: i % 2 ? 0.6 : -0.6 }}
              whileTap={reduce ? undefined : { y: 2, scale: 0.98 }}
              transition={SPRING}
              className={`group relative flex min-h-32 w-full items-center gap-4 rounded-neo-xl border-[3px] border-edu-line bg-edu-surface p-4 text-start shadow-edu-lip sm:gap-5 sm:p-5 ${shown ? 'ring-4 ring-neo-lime ring-offset-2 ring-offset-edu-page' : ''} focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan`}
            >
              <span
                aria-hidden="true"
                className={`grid size-20 shrink-0 place-items-center rounded-neo-lg border-[3px] border-neo-black font-neo-display text-3xl font-black ${accent.tile}`}
              >
                <bdi>{classBadge(c.name)}</bdi>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block break-words font-neo-display text-xl font-black leading-tight text-edu-ink sm:text-2xl">
                  <bdi>{c.name}</bdi>
                </span>
                {shown ? (
                  <span data-testid="picker-shown-sticker" className="mt-1 inline-block rounded-neo-pill border-2 border-neo-black bg-neo-lime px-2 py-0.5 font-neo-body text-xs font-black text-neo-black">
                    {t('teacher.reports.picker.showing')}
                  </span>
                ) : null}
                {typeof c.member_count === 'number' && (
                  <span className="mt-2 block">
                    <StudentCount count={c.member_count} />
                  </span>
                )}
              </span>
              <span className="grid size-11 shrink-0 place-items-center rounded-neo border-[3px] border-edu-line bg-edu-surface text-edu-ink transition-transform duration-200 group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
                <DirectionalIcon icon={ChevronRight} className="size-6" />
              </span>
            </m.button>
          </m.li>
        );
      })}
    </ul>
  );
}
