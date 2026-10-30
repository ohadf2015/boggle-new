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
  { tile: 'bg-neo-purple text-black', glow: 'hover:shadow-hard-purple' },
  { tile: 'bg-neo-cyan text-black', glow: 'hover:shadow-hard-cyan' },
  { tile: 'bg-neo-pink text-black', glow: 'hover:shadow-hard-pink' },
  { tile: 'bg-neo-lime text-black', glow: 'hover:shadow-hard-lime' },
] as const;

export const accentFor = (i: number) => ACCENTS[i % ACCENTS.length];

const SPRING = { type: 'spring', stiffness: 380, damping: 26 } as const;

function StudentCount({ count }: { count: number }) {
  const { t } = useLanguage();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-neo-cream/40 bg-neo-black/30 px-2.5 py-0.5 text-sm font-bold text-neo-cream tabular-nums">
      <Users aria-hidden="true" className="size-4" />
      <span className="sr-only">{t('teacher.reports.metrics.totalStudents')}: </span>
      {count}
    </span>
  );
}

export function ClassroomPicker({
  classrooms,
  onSelect,
}: {
  classrooms: readonly PickerClass[];
  onSelect: (id: string) => void;
}) {
  const reduce = useReducedMotion();
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {classrooms.map((c, i) => {
        const accent = accentFor(i);
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
              whileHover={reduce ? undefined : { y: -4, rotate: i % 2 ? 0.6 : -0.6 }}
              whileTap={reduce ? undefined : { y: 2, scale: 0.98 }}
              transition={SPRING}
              className={`group relative flex min-h-28 w-full items-center gap-4 rounded-neo-lg border-2 border-neo-cream/40 bg-neo-navy-light/95 p-4 text-start shadow-hard transition-shadow duration-150 ${accent.glow} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan`}
            >
              <span
                aria-hidden="true"
                className={`grid size-16 shrink-0 place-items-center rounded-neo border-2 border-black font-neo-display text-2xl font-black shadow-hard-sm ${accent.tile}`}
              >
                <bdi>{classBadge(c.name)}</bdi>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block break-words font-neo-display text-xl font-bold leading-tight text-neo-white">
                  <bdi>{c.name}</bdi>
                </span>
                {typeof c.member_count === 'number' && (
                  <span className="mt-2 block">
                    <StudentCount count={c.member_count} />
                  </span>
                )}
              </span>
              <span className="grid size-11 shrink-0 place-items-center rounded-neo border-2 border-neo-cream/60 text-neo-cream transition-transform duration-200 group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
                <DirectionalIcon icon={ChevronRight} className="size-6" />
              </span>
            </m.button>
          </m.li>
        );
      })}
    </ul>
  );
}

/** Class report header: the picker's badge carried over so the drill-down reads as one object. */
export function ClassHero({ name, memberCount }: { name: string; memberCount?: number }) {
  const reduce = useReducedMotion();
  return (
    <m.div
      initial={reduce ? false : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={SPRING}
      className="flex items-center gap-3 rounded-neo-lg border-2 border-neo-cream/40 bg-neo-navy-light/95 p-3 shadow-hard sm:gap-4 sm:p-4"
    >
      <span
        aria-hidden="true"
        className="grid size-12 shrink-0 place-items-center rounded-neo border-2 border-neo-cream/50 bg-neo-navy font-neo-display text-xl font-black text-neo-cream sm:size-14 sm:text-2xl"
      >
        <bdi>{classBadge(name)}</bdi>
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="break-words font-neo-display text-2xl font-bold leading-tight text-neo-white sm:text-3xl">
          <bdi>{name}</bdi>
        </h1>
        {typeof memberCount === 'number' && (
          <span className="mt-1.5 block">
            <StudentCount count={memberCount} />
          </span>
        )}
      </div>
    </m.div>
  );
}
