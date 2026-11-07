'use client';

import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NB_ADVANCED } from '@/components/teacher/nb/nbStyles';

interface ResultsMoreToolsProps {
  label: string;
  children: ReactNode;
  className?: string;
}

/** Tools the teacher reaches for after class (parent share, PDF). Mounted on first open: the PDF offer fetches and tracks on mount. */
export function ResultsMoreTools({ label, children, className }: ResultsMoreToolsProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div data-testid="edu-results-more" data-open={open ? 'true' : 'false'} className={cn('flex shrink-0 flex-col gap-2', className)}>
      <button
        type="button"
        data-testid="edu-results-more-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={cn(NB_ADVANCED, '@5xl/results:text-base @[96rem]/results:min-h-14 @[96rem]/results:text-xl')}
      >
        <span className="min-w-0">{label}</span>
        <ChevronDown className={cn('size-5 shrink-0 transition-transform duration-200 motion-reduce:transition-none', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && (
        <div id={panelId} className="flex flex-col gap-2 @5xl/results:gap-3">
          {children}
        </div>
      )}
    </div>
  );
}

export default ResultsMoreTools;
