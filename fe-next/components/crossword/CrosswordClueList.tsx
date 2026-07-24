'use client';

import { useMemo } from 'react';
import type { Slot } from '@/lib/crossword/types';

export interface CrosswordClueListProps {
  slots: Slot[];
  activeSlotId: string | null;
  onSelect: (slot: Slot) => void;
  t: (key: string, fallbackOrParams?: string | Record<string, string | number>) => string;
  columns?: 'responsive' | 'stacked';
  capturedSlotIds?: string[];
  /** Slot IDs that just got solved — brief capture flash on the clue item. */
  wordSolvedSlots?: string[];
}

export function CrosswordClueList({
  slots,
  activeSlotId,
  onSelect,
  t,
  columns = 'responsive',
  capturedSlotIds,
  wordSolvedSlots,
}: CrosswordClueListProps) {
  const { across, down } = useMemo(() => {
    const byNum = (a: Slot, b: Slot) => a.number - b.number;
    return {
      across: slots.filter((s) => s.dir === 'across').sort(byNum),
      down: slots.filter((s) => s.dir === 'down').sort(byNum),
    };
  }, [slots]);

  return (
    <div
      className={`grid gap-3 w-full ${
        columns === 'stacked' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
      }`}
    >
      <Section
        dir="across"
        heading={t('crossword.acrossHeading')}
        slots={across}
        activeSlotId={activeSlotId}
        onSelect={onSelect}
        capturedSlotIds={capturedSlotIds}
        wordSolvedSlots={wordSolvedSlots}
        t={t}
      />
      <Section
        dir="down"
        heading={t('crossword.downHeading')}
        slots={down}
        activeSlotId={activeSlotId}
        onSelect={onSelect}
        capturedSlotIds={capturedSlotIds}
        wordSolvedSlots={wordSolvedSlots}
        t={t}
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
  capturedSlotIds,
  wordSolvedSlots,
  t,
}: {
  dir: 'across' | 'down';
  heading: string;
  slots: Slot[];
  activeSlotId: string | null;
  onSelect: (slot: Slot) => void;
  capturedSlotIds?: string[];
  wordSolvedSlots?: string[];
  t: (key: string, fallbackOrParams?: string | Record<string, string | number>) => string;
}) {
  return (
    <div
      data-dir={dir}
      className="flex flex-col gap-0.5 bg-neo-cream border-2 border-black rounded-none p-2.5 shadow-hard"
    >
      <h2 className="font-neo-display font-extrabold text-xs uppercase tracking-wide text-neo-navy px-1 pb-1.5 mb-0.5 border-b-2 border-black/15">
        {heading}
      </h2>
      <ul className="flex flex-col">
        {slots.map((slot) => {
          const active = slot.id === activeSlotId;
          const captured = capturedSlotIds?.includes(slot.id) ?? false;
          const justSolved = wordSolvedSlots?.includes(slot.id) ?? false;
          return (
            <li key={slot.id}>
              <button
                type="button"
                data-slot-number={slot.number}
                data-captured={captured ? 'true' : undefined}
                aria-current={active ? 'true' : undefined}
                onClick={() => onSelect(slot)}
                className={`flex w-full items-baseline gap-2 text-start rounded-none px-2 py-1 leading-snug transition-colors ${
                  active
                    ? 'bg-[#ffe9a8] text-neo-navy font-semibold'
                    : captured
                      ? 'bg-neo-cyan/10 text-neo-navy/90 hover:bg-neo-cyan/20'
                      : 'text-neo-navy/90 hover:bg-black/5'
                } ${justSolved ? 'cw-capture-flash' : ''}`}
              >
                <span className={`shrink-0 font-neo-display font-bold tabular-nums text-sm w-5 text-end ${captured ? 'text-neo-cyan' : ''}`}>
                  {slot.number}
                </span>
                <span className="font-neo-body text-sm">{slot.clue}</span>
                {captured && (
                  <span className="ms-auto shrink-0 text-neo-cyan text-[10px] font-bold" aria-label={t('crossword.captured')}>✓</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}