'use client';

import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

/** An inline refusal that stays on screen and says what to do next. */
export function JoinAlert({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      role="alert"
      className={cn(
        'flex items-start gap-2 rounded-neo border-3 border-neo-black bg-neo-red px-3 py-2.5 font-neo-body text-sm font-bold leading-snug text-neo-black shadow-hard motion-safe:animate-neo-shake lg:text-base',
        className
      )}
    >
      <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 lg:size-5" strokeWidth={2.75} />
      <span>{children}</span>
    </p>
  );
}
