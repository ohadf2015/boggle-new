'use client';

import { useMemo } from 'react';
import type { Slot } from '@/lib/crossword/types';

export interface CrosswordClueListProps {
  slots: Slot[];
  activeSlotId: string | null;
  onSelect: (slot: Slot) => void;
  t: (key: string) => string;
}

/**
 * The Across/Down clue columns — the other half of "looks like a crossword" (alongside black
 * blocks). Clicking a clue jumps focus to that slot; the active slot is highlighted. The compact
 * ClueBar stays for mobile focus, but this is the at-a-glance overview real solvers expect.
 */
export function CrosswordClueList({ slots, activeSlotId, onSelect, t }: CrosswordClueListProps) {
  const { across, down } = useMemo(() => {
    const byNum = (a: Slot, b: Slot) => a.number - b.number;
    return {
      across: slots.filter((s) => s.dir === 'across').sort(byNum),
      down: slots.filter((s) => s.dir === 'down').sort(byNum),
    };
  }, [slots]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
      <Section
        dir="across"
        heading={t('crossword.acrossHeading')}
        slots={across}
        activeSlotId={activeSlotId}
        onSelect={onSelect}
      />
      <Section
        dir="down"
        heading={t('crossword.downHeading')}
        slots={down}
        activeSlotId={activeSlotId}
        onSelect={onSelect}
      />
    </div>
  );
}

function Section({
  dir,
  heading,
  slots,
  activeSlotId,
  onSelect,
}: {
  dir: 'across' | 'down';
  heading: string;
  slots: Slot[];
  activeSlotId: string | null;
  onSelect: (slot: Slot) => void;
}) {
  return (
    <div
      data-dir={dir}
      className="flex flex-col gap-1 bg-neo-navy-light border-neo border-black rounded-neo p-2"
    >
      <h2 className="font-neo-display font-extrabold text-xs uppercase tracking-wide text-neo-cyan px-1 pb-1">
        {heading}
      </h2>
      <ul className="flex flex-col gap-0.5">
        {slots.map((slot) => {
          const active = slot.id === activeSlotId;
          return (
            <li key={slot.id}>
              <button
                type="button"
                data-slot-number={slot.number}
                aria-current={active ? 'true' : undefined}
                onClick={() => onSelect(slot)}
                className={`flex w-full items-baseline gap-2 text-start rounded-[4px] px-2 py-1 leading-snug transition-colors ${
                  active
                    ? 'bg-neo-cyan text-neo-navy font-semibold'
                    : 'text-neo-white hover:bg-neo-navy active:bg-neo-navy'
                }`}
              >
                <span className="shrink-0 font-neo-display font-bold tabular-nums text-sm w-5 text-end">
                  {slot.number}
                </span>
                <span className="font-neo-body text-sm">{slot.clue}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
