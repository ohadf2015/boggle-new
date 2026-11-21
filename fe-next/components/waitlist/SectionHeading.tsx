import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { Typo } from './typography';

const MARKERS = { pink: 'bg-neo-pink', lime: 'bg-neo-lime', cyan: 'bg-neo-cyan', purple: 'bg-neo-purple' } as const;

interface SectionHeadingProps {
  id?: string;
  typo: Typo;
  accent: keyof typeof MARKERS;
  children: ReactNode;
}

export function SectionHeading({ id, typo, accent, children }: SectionHeadingProps) {
  return (
    <div className="mb-7 flex items-center gap-4">
      <span aria-hidden="true" className={cn('inline-block h-3.5 w-3.5 shrink-0 -rotate-45 border-neo-thick border-neo-black', MARKERS[accent])} />
      <h2 id={id} className={cn('text-2xl leading-tight text-neo-white sm:text-4xl', typo.display, typo.caps)}>
        {children}
      </h2>
    </div>
  );
}
