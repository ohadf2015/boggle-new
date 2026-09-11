/**
 * One labelled row of mutually exclusive chips.
 *
 * The old setup screen spent a full stacked block on each of timer, board size
 * and word length — three headings, three grids, a screen and a half of scroll
 * before the teacher reached the thing that decides the lesson. One row each,
 * same choices, same keyboard semantics.
 */

'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LobbyChoice<T extends string | number> {
  value: T;
  label: string;
}

export interface LobbyChoiceRowProps<T extends string | number> {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Tailwind text colour for the icon — a literal class, never interpolated. */
  iconClassName?: string;
  choices: ReadonlyArray<LobbyChoice<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Literal class for the selected chip. */
  selectedClassName?: string;
}

export function LobbyChoiceRow<T extends string | number>({
  id,
  label,
  icon: Icon,
  iconClassName = 'text-neo-cyan',
  choices,
  value,
  onChange,
  selectedClassName = 'bg-neo-cyan text-black shadow-hard',
}: LobbyChoiceRowProps<T>) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span
        id={id}
        className="inline-flex min-w-[7.5rem] items-center gap-1.5 font-neo-display text-xs font-black uppercase text-neo-white/70"
      >
        <Icon className={cn('size-4 shrink-0', iconClassName)} strokeWidth={3} aria-hidden="true" />
        {label}
      </span>
      <div role="radiogroup" aria-labelledby={id} className="flex flex-wrap gap-2">
        {choices.map((choice) => {
          const isSelected = choice.value === value;
          return (
            <button
              key={String(choice.value)}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={choice.label}
              onClick={() => onChange(choice.value)}
              className={cn(
                'min-h-9 rounded-neo border-2 border-black px-3 py-1 font-neo-display text-xs font-black uppercase transition-all',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
                isSelected
                  ? selectedClassName
                  : 'border-neo-cream bg-neo-navy-light text-neo-cream shadow-hard-sm hover:bg-neo-navy'
              )}
            >
              {choice.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default LobbyChoiceRow;
