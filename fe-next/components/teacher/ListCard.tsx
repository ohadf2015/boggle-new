'use client';

import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { GAME_CARD } from './home/homeStyles';

interface ListCardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** A `bg-neo-*` class for the thin edge that tells cards apart. */
  accentClass: string;
  title: ReactNode;
  titleText: string;
  fact: ReactNode;
  factTestId: string;
  menu: ReactNode;
  action: ReactNode;
}

export const LIST_CARD_TITLE =
  'line-clamp-2 block w-full rounded-neo py-2 text-start decoration-2 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan';

export const LIST_CARD_ACCENT = 'absolute inset-y-0 start-0 w-2 border-e-[3px] border-neo-black';

/** The one card shape for teacher lists: name, one fact, one action, one menu. */
export function ListCard({ accentClass, title, titleText, fact, factTestId, menu, action, className, children, ...rest }: ListCardProps) {
  return (
    <article {...rest} className={cn(GAME_CARD, 'relative flex min-h-56 w-full min-w-0 flex-col gap-2 overflow-hidden py-4 pe-4 ps-6', className)}>
      <span aria-hidden="true" data-testid="list-card-accent" className={cn(LIST_CARD_ACCENT, accentClass)} />
      <div className="flex min-w-0 items-start gap-2">
        <h3 title={titleText} className="line-clamp-2 min-w-0 flex-1 font-neo-display text-2xl font-black leading-tight text-neo-cream [overflow-wrap:anywhere]">
          {title}
        </h3>
        {menu}
      </div>
      <div data-testid={factTestId} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-neo-body text-base font-semibold text-neo-cream/80">
        {fact}
      </div>
      <div className="mt-auto pt-3">{action}</div>
      {children}
    </article>
  );
}
