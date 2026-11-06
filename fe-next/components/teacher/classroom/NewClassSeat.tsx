'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EduMascot } from '@/components/education/EduMascot';
import { ARCADE_BLOCK, type ArcadeAccent } from '@/lib/education/arcadeAccent';
import { GAME_CARD, GAME_CARD_HOVER } from '../home/homeStyles';

/** The empty seat beside too few classes on a wide row: a short game card that starts a new class. */
export function NewClassSeat({
  href,
  label,
  hint,
  perView,
  accent,
}: {
  href: string;
  label: string;
  hint: string;
  perView: number;
  accent: ArcadeAccent;
}) {
  return (
    <Link
      href={href}
      data-testid="classroom-new-card"
      style={{ flexBasis: `calc((100% - ${perView - 1} * var(--gap)) / ${perView})`, minWidth: 0 }}
      className={cn(
        'group relative flex shrink-0 snap-start flex-col self-start',
        GAME_CARD,
        GAME_CARD_HOVER,
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream',
      )}
    >
      <span
        className={cn('relative flex h-28 items-end justify-center rounded-t-[9px] border-b-[3px] border-neo-black', ARCADE_BLOCK[accent])}
      >
        <EduMascot moment="firstClass" size={128} className="relative -mb-1 size-32 animate-edu-bob" />
      </span>
      <span className="flex items-center gap-3 p-4">
        <span className="grid size-12 shrink-0 rotate-6 place-items-center rounded-neo border-[3px] border-neo-black bg-neo-yellow text-neo-black shadow-hard transition-[rotate,scale] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:rotate-0 group-hover:scale-110 motion-reduce:transition-none">
          <Plus className="size-7" strokeWidth={3.5} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block font-neo-display text-2xl font-black leading-tight text-neo-cream">{label}</span>
          <span className="block text-sm font-bold text-neo-cream/80">{hint}</span>
        </span>
      </span>
    </Link>
  );
}
