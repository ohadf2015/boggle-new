'use client';

import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LobbyClassPickerProps {
  classrooms: readonly { id: string; name: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  label: string;
}

/** Tap 1 of the host flow: which class is playing. One class = a confirmation chip, not a question. */
export function LobbyClassPicker({ classrooms, selectedId, onSelect, label }: LobbyClassPickerProps) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="inline-flex shrink-0 items-center gap-1 font-neo-display text-xs font-black uppercase tracking-wide text-neo-cream/80 lg:text-sm">
        <Users className="size-4" aria-hidden="true" />
        {label}
      </span>
      <div
        data-testid="lobby-class-picker"
        role="radiogroup"
        aria-label={label}
        className="flex min-w-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {classrooms.map((c) => {
          const on = c.id === selectedId;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => !on && onSelect(c.id)}
              className={cn(
                'min-h-[40px] max-w-[12rem] shrink-0 truncate rounded-full border-[2px] px-4 font-neo-body text-sm font-bold',
                'transition-[transform,colors] duration-150 active:scale-[0.97] motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
                on ? 'border-neo-black bg-neo-lime text-neo-black shadow-hard-sm' : 'border-neo-cream/70 bg-neo-navy/85 text-neo-cream hover:bg-neo-navy-light',
              )}
            >
              <span dir="auto">{c.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default LobbyClassPicker;
