'use client';

import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export function EduStudentLobbyFold({ testId, label, children }: { testId: string; label: ReactNode; children: ReactNode }) {
  return (
    <details data-testid={testId} className="group w-full border-t-2 border-edu-line">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 py-2 font-neo-display text-base font-black text-edu-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">{label}</span>
        <ChevronDown className="size-5 shrink-0 transition-transform duration-200 ease-out group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
      </summary>
      <div className="flex flex-col gap-3 pb-3 pt-1">{children}</div>
    </details>
  );
}
