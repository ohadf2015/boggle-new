'use client';

import { Printer } from 'lucide-react';

export function PrintReportButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-11 items-center gap-2 rounded-neo border-2 border-neo-black bg-neo-lime px-4 text-sm font-black text-neo-black shadow-hard-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan motion-reduce:transition-none print:hidden"
    >
      <Printer className="size-4" aria-hidden="true" />
      {label}
    </button>
  );
}
