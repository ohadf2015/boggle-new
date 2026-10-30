'use client';

import type { ReactNode } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LobbySetupDisclosureProps {
  label: string;
  /** One line of what the closed door holds, so a teacher can confirm without opening it. */
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function LobbySetupDisclosure({ label, summary, open, onToggle, children }: LobbySetupDisclosureProps) {
  return (
    <section className="flex flex-col gap-3">
      <button
        type="button"
        data-testid="lobby-setup-summary"
        aria-expanded={open}
        onClick={onToggle}
        className={cn(
          'flex min-h-11 w-full items-center gap-2 rounded-neo border-2 border-neo-cream/35 bg-neo-navy-light px-3 py-2 text-start',
          'font-neo-body text-sm text-neo-cream/70 transition-colors hover:border-neo-cream/50 hover:text-neo-cream',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy'
        )}
      >
        <SlidersHorizontal className="size-4 shrink-0" strokeWidth={3} aria-hidden="true" />
        <span className="shrink-0 font-bold text-neo-cream">{label}</span>
        <span data-testid="lobby-setup-line" className="hidden min-w-0 flex-1 @lg/lobby:block">{summary}</span>
        <ChevronDown
          className={cn('ms-auto size-5 shrink-0 transition-transform duration-200 motion-reduce:transition-none', open && 'rotate-180')}
          strokeWidth={3}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div data-testid="lobby-setup-body" className="flex flex-col gap-5">
          {children}
        </div>
      )}
    </section>
  );
}

export default LobbySetupDisclosure;
