/**
 * ClassSwitcher — which class the command deck is describing.
 *
 * Mirrors `SourceSwitch` on the PLAY NOW panel deliberately: a `role="group"`
 * of `aria-pressed` buttons, not `role="tab"`. The dashboard's own contract
 * test forbids a tab bar, and a tab implies pages of a form to work through —
 * this is one deck being pointed at a different class.
 *
 * Each chip carries its own roster count, so the ROW is informative even
 * before anything is selected: a teacher sees at a glance which class is
 * empty without switching to it. Solid fills and explicit text colours — an
 * unstyled button inherits the shell's white, which on cream is 1.02:1.
 */

'use client';

import { memo } from 'react';
import { Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export interface ClassSwitcherClassroom {
  id: string;
  name: string;
  member_count: number;
}

export interface ClassSwitcherProps {
  classrooms: ClassSwitcherClassroom[];
  selectedId: string;
  onSelect: (id: string) => void;
  className?: string;
}

export const ClassSwitcher = memo(function ClassSwitcher({
  classrooms,
  selectedId,
  onSelect,
  className,
}: ClassSwitcherProps) {
  const { t } = useLanguage();

  // One class is not a choice, and a control offering none is furniture in
  // front of the content.
  if (classrooms.length < 2) return null;

  return (
    <div
      role="group"
      aria-label={t('teacher.pulse.switcherLabel')}
      className={cn('flex flex-wrap gap-2', className)}
    >
      {classrooms.map((c) => {
        const on = c.id === selectedId;
        return (
          <button
            key={c.id}
            type="button"
            data-testid={`class-switch-${c.id}`}
            aria-pressed={on}
            onClick={() => onSelect(c.id)}
            className={cn(
              'inline-flex min-h-11 max-w-full items-center gap-2 rounded-neo border-3 px-3 py-2',
              'font-neo-display text-xs font-black uppercase tracking-wide transition-all duration-100',
              'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
              on
                // Selected: a solid cyan slab with a black edge (~20:1) and
                // black text, so "which class am I on" is unmissable.
                ? 'border-black bg-neo-cyan text-black shadow-hard-sm'
                // Unselected on navy: black would measure 1.23:1 and vanish,
                // so the edge is cream (3.74:1).
                : 'border-neo-cream/40 bg-neo-navy-light text-neo-white hover:-translate-y-0.5'
            )}
          >
            <span className="truncate">{c.name}</span>
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-neo px-1.5 py-0.5 tabular-nums',
                on ? 'bg-black/15 text-black' : 'bg-neo-navy text-neo-white'
              )}
            >
              <Users className="size-3" strokeWidth={3} aria-hidden="true" />
              {c.member_count || 0}
            </span>
          </button>
        );
      })}
    </div>
  );
});

export default ClassSwitcher;
