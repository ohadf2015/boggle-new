'use client';

import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MUTED, PANEL } from './panelStyles';

interface Props {
  id: string;
  title: string;
  /** One line shown while closed, e.g. the number the section would show. */
  summary?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

/** A collapsed-by-default panel whose body mounts only while open, so a closed one costs no fetches or polling. */
export function DrillSection({ id, title, summary, open, onOpenChange, children }: Props) {
  return (
    <section id={id} className="mb-3 scroll-mt-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-body`}
        onClick={() => onOpenChange(!open)}
        className={cn(PANEL, 'flex w-full items-center justify-between gap-3 text-start focus-visible:outline-2 focus-visible:outline-neo-cyan')}
      >
        <span className="flex flex-col">
          <span className="text-base font-bold text-neo-cream">{title}</span>
          {summary && !open && <span className={`text-xs ${MUTED}`}>{summary}</span>}
        </span>
        <ChevronDown className={cn('h-5 w-5 shrink-0 text-neo-cream transition-transform motion-reduce:transition-none', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && (
        <div id={`${id}-body`} className="mt-3">
          {children}
        </div>
      )}
    </section>
  );
}
