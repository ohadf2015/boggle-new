'use client';

/** What a reward paid out: one white hard-shadow card per thing earned, popping in one after another. */
import type { ReactNode } from 'react';
import { m } from 'framer-motion';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RewardChip {
  id: string;
  icon: ReactNode;
  value: ReactNode;
  label: ReactNode;
  /** Small tag on the card's top edge (e.g. the item's tier). */
  badge?: string;
  /** Badge fill, as a raw colour (tier colours are data, not classes). */
  badgeHex?: string;
  /** Coins fly into this card: `[data-reward-landing="<id>"]`. */
  landing?: boolean;
}

interface Props {
  label: string;
  chips: RewardChip[];
  reduced: boolean;
  delay?: number;
}

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

export default function RewardChipRow({ label, chips, reduced, delay = 0 }: Props) {
  return (
    <ul aria-label={label} className="grid w-full gap-3" style={{ gridTemplateColumns: `repeat(${chips.length}, minmax(0, 1fr))` }}>
      {chips.map((chip, i) => (
        <m.li
          key={chip.id}
          data-reward-landing={chip.landing ? chip.id : undefined}
          initial={reduced ? false : { opacity: 0, y: 18, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.25, ease: EASE_OUT, delay: delay + i * 0.08 }}
          className="relative flex min-h-[8.5rem] flex-col items-center justify-center gap-1 rounded-2xl border-[3px] border-black bg-white px-1.5 pb-2.5 pt-3 text-center text-neo-navy shadow-[4px_4px_0_0_#000]"
        >
          {chip.badge && (
            <span
              className={cn('absolute -top-3 max-w-[90%] truncate rounded-full border-2 border-black px-2 text-[11px] font-black uppercase leading-5 tracking-wide text-black shadow-[2px_2px_0_0_#000]', !chip.badgeHex && 'bg-neo-yellow')}
              style={chip.badgeHex ? { background: chip.badgeHex } : undefined}
            >
              {chip.badge}
            </span>
          )}
          <span aria-hidden="true" data-reward-icon="" className="grid h-14 w-14 place-items-center">{chip.icon}</span>
          <span className="line-clamp-2 font-neo-display text-xl font-black leading-tight tabular-nums">{chip.value}</span>
          <span className="line-clamp-2 text-sm font-bold leading-tight text-neo-navy/80">{chip.label}</span>
        </m.li>
      ))}
    </ul>
  );
}

/** The XP mark on a reward card. */
export function XpIcon() {
  return (
    <span className="grid h-12 w-12 place-items-center rounded-full border-[3px] border-black bg-neo-lime shadow-[2px_2px_0_0_#000]">
      <Zap className="h-6 w-6 fill-black text-black" />
    </span>
  );
}
