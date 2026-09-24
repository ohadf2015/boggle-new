'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { cn } from '@/lib/utils';

export type FreshAccent = 'lime' | 'pink' | 'cyan' | 'purple';

/** Complete literal class strings per accent (Tailwind v4 only sees literals). */
const LINK_TONE: Record<FreshAccent, string> = {
  lime: 'bg-neo-lime',
  pink: 'bg-neo-pink',
  cyan: 'bg-neo-cyan',
  purple: 'bg-neo-purple',
};

export interface FreshSectionProps {
  /** data-fresh-section value: daily | friends | languages | classrooms ... */
  id: string;
  title: string;
  line: string;
  /** The one visual. Decorative art only (alt=""); the headline carries meaning. */
  art: ReactNode;
  link?: { href: string; label: string };
  accent: FreshAccent;
  /** Art on the start side at ≥md (sections alternate). Mobile always stacks text first. */
  flip?: boolean;
}

/**
 * Shared layout for fresh-page sections 2-6: one headline, one line, one piece
 * of art, one link. Stacks at 390; two columns at ≥md, alternating sides.
 * Content is visible at rest: motion is hover/press only, behind motion-safe.
 */
export function FreshSection({ id, title, line, art, link, accent, flip }: FreshSectionProps) {
  const headingId = `fresh-${id}-title`;
  return (
    <section
      data-fresh-section={id}
      aria-labelledby={headingId}
      className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-24 sm:px-6 md:grid-cols-2 md:gap-20 md:py-40 lg:px-8"
    >
      <div className="flex flex-col items-start gap-5">
        <h2
          id={headingId}
          className="font-neo-display text-4xl font-bold leading-[1.05] text-neo-cream text-balance md:text-5xl"
        >
          {title}
        </h2>
        <p className="max-w-[38ch] font-neo-body text-lg leading-relaxed text-neo-cream/80 md:text-xl">{line}</p>
        {link && (
          <Link
            href={link.href}
            className={cn(
              'mt-2 inline-flex items-center gap-2 rounded-neo border-3 border-neo-black px-5 py-3',
              'font-neo-display text-base font-bold text-neo-black shadow-hard',
              'active:translate-y-[2px] active:shadow-hard-pressed',
              'motion-safe:transition-transform motion-safe:hover:-translate-y-0.5',
              'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neo-cream',
              LINK_TONE[accent]
            )}
          >
            {link.label}
            <DirectionalIcon icon={ArrowRight} className="h-4 w-4" />
          </Link>
        )}
      </div>
      <div className={cn('flex justify-center', flip && 'md:order-first')}>{art}</div>
    </section>
  );
}
