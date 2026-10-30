'use client';

import { useEffect, useRef } from 'react';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LobbyClassPickerProps {
  classrooms: readonly { id: string; name: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  label: string;
}

/** Which class is playing; with one class there is no question, and the setup row already names it. */
export function LobbyClassPicker({ classrooms, selectedId, onSelect, label }: LobbyClassPickerProps) {
  const selectedRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    selectedRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [selectedId]);
  if (classrooms.length < 2) return null;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="inline-flex shrink-0 items-center gap-1 font-neo-body text-xs font-bold text-neo-cream/70 lg:text-sm">
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
              ref={on ? selectedRef : undefined}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => !on && onSelect(c.id)}
              className={cn(
                'min-h-11 max-w-[12rem] shrink-0 truncate rounded-full border-[2px] px-4 font-neo-body text-sm font-bold',
                'transition-[transform,colors] duration-150 active:scale-[0.97] motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
                on ? 'border-neo-lime bg-neo-navy-light text-neo-cream ring-2 ring-neo-lime' : 'border-neo-cream/35 bg-neo-navy-light text-neo-cream/85 hover:border-neo-cream/50',
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
