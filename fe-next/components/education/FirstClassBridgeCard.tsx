'use client';

import Link from 'next/link';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { firstClassBridgeCopy } from '@/lib/education/day0FirstClassBridge';
import { trialCopyBase, TRIAL_COPY_RTL } from '@/lib/education/pro/trialCtaCopy';

type StartHandler = () => void;

export interface FirstClassBridgeCardProps {
  language: string;
  /** Existing first live class or pack-assignment start. Not a new flow. */
  href: string;
  onStart?: StartHandler;
  className?: string;
}

/** Replaces the day-0 Polar card. The href is the class the teacher just made. */
export function FirstClassBridgeCard({ language, href, onStart, className }: FirstClassBridgeCardProps) {
  const copy = firstClassBridgeCopy(language);
  const dir = TRIAL_COPY_RTL.has(trialCopyBase(language)) ? 'rtl' : undefined;
  return (
    <aside
      data-testid="day0-first-class-bridge"
      dir={dir}
      className={cn(
        'shrink-0 rounded-neo border-2 border-neo-cream bg-neo-navy-light p-4 text-neo-white',
        className,
      )}
    >
      <h2 className="font-neo-display text-base font-black leading-snug text-neo-cream">{copy.title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-neo-white/80">{copy.body}</p>
      <Link
        href={href}
        data-testid="day0-first-class-cta"
        onClick={onStart}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-neo border-2 border-neo-black bg-neo-lime px-4 text-center font-neo-display text-sm font-bold text-neo-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan active:translate-y-px"
      >
        <Play className="size-4 fill-current" aria-hidden="true" />
        {copy.cta}
      </Link>
    </aside>
  );
}
