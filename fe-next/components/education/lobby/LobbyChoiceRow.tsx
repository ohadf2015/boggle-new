/**
 * One labelled row of mutually exclusive chips.
 *
 * The old setup screen spent a full stacked block on each of timer, board size
 * and word length — three headings, three grids, a screen and a half of scroll
 * before the teacher reached the thing that decides the lesson. One row each,
 * same choices, same keyboard semantics.
 */

'use client';

import { Check, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** The house selection style: ring + check, never a colored fill. */
export const CALM_SELECTED = 'border-neo-lime bg-neo-navy-light text-neo-cream';
export const CALM_IDLE = 'border-neo-cream/35 bg-transparent text-neo-cream hover:border-neo-cream/60';
export const CALM_FOCUS =
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy';

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
  /** Freeze the row (e.g. a Pro-gated dial for a free teacher). */
  disabled?: boolean;
}

export function LobbyChoiceRow<T extends string | number>({
  id,
  label,
  icon: Icon,
  iconClassName = 'text-neo-cream/70',
  choices,
  value,
  onChange,
  selectedClassName = CALM_SELECTED,
  disabled = false,
}: LobbyChoiceRowProps<T>) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span
        id={id}
        className="inline-flex min-w-[7.5rem] items-center gap-1.5 font-neo-display text-sm font-bold text-neo-cream"
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
              disabled={disabled}
              onClick={() => onChange(choice.value)}
              className={cn(
                'inline-flex min-h-9 items-center gap-1.5 rounded-neo border-2 px-3 py-1 font-neo-display text-sm font-bold transition-colors',
                CALM_FOCUS,
                disabled && 'cursor-not-allowed opacity-60',
                isSelected ? selectedClassName : CALM_IDLE
              )}
            >
              {isSelected && <Check className="size-3.5 shrink-0" strokeWidth={3} aria-hidden="true" />}
              {choice.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default LobbyChoiceRow;
