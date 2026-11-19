'use client';

import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { GAME_CARD } from './home/homeStyles';
import { NB_BLOCK, type NbColor } from './nb/nbStyles';

interface ListCardProps extends Omit<HTMLAttributes<HTMLElement>, 'title' | 'color'> {
  color: NbColor;
  title: ReactNode;
  titleText: string;
  /** Sits before the title in the band, e.g. a word-count badge. */
  lead?: ReactNode;
  /** A short line under the title, inside the band. */
  sub?: ReactNode;
  /** A sticker between the title and the menu. */
  tag?: ReactNode;
  menu: ReactNode;
  action: ReactNode;
}

export const LIST_CARD_TITLE =
  'line-clamp-2 block w-full rounded-neo text-start decoration-2 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-black';

export const LIST_CARD_ACCENT = 'absolute inset-y-0 start-0 w-2 border-e-[3px] border-neo-black';

export const LIST_CARD_BAND = 'flex min-w-0 items-center gap-2 border-b-[3px] border-neo-black px-3.5 py-2.5';

/** The one card shape for teacher lists: a color band with the name and menu, a body, one action. */
export function ListCard({ color, title, titleText, lead, sub, tag, menu, action, className, children, ...rest }: ListCardProps) {
  return (
    <article {...rest} className={cn(GAME_CARD, '@container relative flex w-full min-w-0 flex-col overflow-hidden', className)}>
      <header data-testid="list-card-band" className={cn(LIST_CARD_BAND, NB_BLOCK[color])}>
        {lead}
        <div className="min-w-0 flex-1">
          <h3 title={titleText} className="line-clamp-2 font-neo-display text-xl font-black leading-tight [overflow-wrap:anywhere] @[24rem]:text-2xl">
            {title}
          </h3>
          {sub}
        </div>
        {tag}
        {menu}
      </header>
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-3.5">
        {children}
        <div className="mt-auto">{action}</div>
      </div>
    </article>
  );
}
