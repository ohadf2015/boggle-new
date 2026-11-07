'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NB_ADVANCED } from './nbStyles';

interface NbAdvancedProps {
  /** Says what is inside, e.g. "Other game types, focus, a note". */
  label: ReactNode;
  closeLabel: ReactNode;
  /** Opens it from the outside, e.g. when a hidden setting is already in use. */
  forceOpen?: boolean;
  testId?: string;
  className?: string;
  children: ReactNode;
}

/** Collapsed dashed row for rarer settings. The body stays mounted (hidden) so its state survives a close. */
export function NbAdvanced({ label, closeLabel, forceOpen = false, testId, className, children }: NbAdvancedProps) {
  const [shown, setOpen] = useState(forceOpen);
  const id = useId();
  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <button
        type="button"
        data-testid={testId}
        aria-expanded={shown}
        aria-controls={id}
        onClick={() => setOpen(!shown)}
        className={NB_ADVANCED}
      >
        <span className="min-w-0">{shown ? closeLabel : label}</span>
        <ChevronDown className={cn('size-5 shrink-0 transition-transform motion-reduce:transition-none', shown && 'rotate-180')} aria-hidden="true" />
      </button>
      <div id={id} hidden={!shown}>
        <div className="flex flex-col gap-4">{children}</div>
      </div>
    </div>
  );
}
