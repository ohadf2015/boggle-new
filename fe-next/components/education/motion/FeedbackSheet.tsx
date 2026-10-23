'use client';

import { m } from 'framer-motion';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { resolvePreset } from '@/lib/education/motion/presets';
import { useEduReducedMotion } from '@/lib/education/motion/useEduReducedMotion';

export type FeedbackVariant = 'correct' | 'incorrect';

const TONE: Record<FeedbackVariant, string> = {
  correct: 'bg-neo-lime text-neo-black',
  incorrect: 'bg-neo-red text-neo-black',
};

export interface FeedbackSheetProps {
  open: boolean;
  variant: FeedbackVariant;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  /** The sound hook: called in the commit that mounts the sheet, so audio and the first frame line up. */
  onShow?: (variant: FeedbackVariant) => void;
  className?: string;
}

export function FeedbackSheet({ open, variant, title, children, action, icon, onShow, className = '' }: FeedbackSheetProps) {
  const reduced = useEduReducedMotion();
  const sheet = resolvePreset('sheetUp', reduced);
  const onShowRef = useRef(onShow);
  onShowRef.current = onShow;

  useLayoutEffect(() => {
    if (open) onShowRef.current?.(variant);
  }, [open, variant]);

  if (!open) return null;

  return (
    <m.div
      key={variant}
      role="status"
      aria-live="polite"
      data-variant={variant}
      initial={sheet.initial}
      animate={sheet.animate}
      transition={sheet.transition}
      className={`fixed inset-x-0 bottom-0 z-50 after:absolute after:inset-x-0 after:top-full after:h-16 after:bg-inherit border-t-4 border-neo-black px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] ${TONE[variant]} ${className}`}
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {icon}
          <div className="min-w-0">
            <p className="font-neo-display text-xl font-black">{title}</p>
            {children ? <div className="text-sm font-bold">{children}</div> : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </m.div>
  );
}
