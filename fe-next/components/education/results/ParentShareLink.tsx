'use client';

import Link from 'next/link';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProPill } from './ProPill';
import { trackResultsAction } from './trackResultsAction';

export const PARENT_SHARE_SOURCE = 'results_parent_share';

interface ParentShareLinkProps {
  language: string;
  hasPro: boolean;
  label: string;
  proLabel: string;
  className?: string;
}

/** Opens in a new tab: leaving the projector tab would drop the live room the class is still in. */
export function ParentShareLink({ language, hasPro, label, proLabel, className }: ParentShareLinkProps) {
  const href = hasPro ? `/${language}/teacher/reports` : `/${language}/teacher/upgrade?source=${PARENT_SHARE_SOURCE}`;
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="edu-results-parent-share"
      onClick={() => trackResultsAction('share_parents', 'projector')}
      className={cn(
        'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-neo-lg border-[3px] border-neo-cream/50 bg-neo-navy-light px-4 py-2 text-center font-neo-display text-base font-black text-neo-cream shadow-hard-lg',
        'transition-[transform,box-shadow] duration-150 hover:-translate-y-px active:translate-x-[3px] active:translate-y-[3px] active:shadow-none motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
        '@5xl/results:min-h-12 @5xl/results:text-lg @[96rem]/results:min-h-16 @[96rem]/results:text-2xl',
        className
      )}
    >
      <Send className="size-[1em] shrink-0" aria-hidden="true" />
      <span className="min-w-0">{label}</span>
      <ProPill label={proLabel} />
    </Link>
  );
}

export default ParentShareLink;
