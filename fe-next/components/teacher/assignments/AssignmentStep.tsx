'use client';

import type { ReactNode } from 'react';

export function AssignmentStep({
  step,
  n,
  label,
  headingId,
  children,
}: {
  step: 'list' | 'who' | 'mode' | 'due';
  n: number;
  label: ReactNode;
  headingId?: string;
  children: ReactNode;
}) {
  return (
    <section data-testid="assignment-step" data-step={step}>
      <h3 id={headingId} className="mb-2 flex items-center gap-2 text-sm font-neo-body font-bold text-neo-white">
        <span
          aria-hidden="true"
          className="grid size-6 shrink-0 place-items-center rounded-neo border-2 border-black bg-neo-cyan font-neo-display text-xs font-black text-neo-black shadow-hard-sm"
        >
          {n}
        </span>
        {label}
      </h3>
      {children}
    </section>
  );
}
