'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EduMascot } from '@/components/education/EduMascot';
import { type ArcadeAccent } from '@/lib/education/arcadeAccent';
import { GAME_CARD, GAME_CARD_HOVER } from '../home/homeStyles';
import { NB_BLOCK } from '../nb/nbStyles';
import { LIST_CARD_BAND } from '../ListCard';

/** The empty seat beside too few classes on a wide row: same shape as a class card, starts a new class. */
export function NewClassSeat({ href, label, hint, accent }: { href: string; label: string; hint: string; accent: ArcadeAccent }) {
  return (
    <Link
      href={href}
      data-testid="classroom-new-card"
      className={cn(
        'group flex w-full min-w-0 flex-col overflow-hidden',
        GAME_CARD,
        GAME_CARD_HOVER,
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream',
      )}
    >
      <span data-testid="list-card-band" className={cn(LIST_CARD_BAND, NB_BLOCK[accent], 'font-neo-display text-xl font-black leading-tight')}>
        <Plus className="size-6 shrink-0" strokeWidth={3} aria-hidden="true" />
        {label}
      </span>
      <span className="flex flex-1 items-center gap-3 p-3.5">
        <span className="min-w-0 flex-1 font-neo-body text-base font-semibold text-neo-cream/80">{hint}</span>
        <EduMascot moment="firstClass" size={96} className="size-24 shrink-0" />
      </span>
    </Link>
  );
}
