'use client';

import { forwardRef, useSyncExternalStore, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const noSubscribe = () => () => {};

/** The step's one primary action: full width, thumb-sized, hard-shadow press. */
export const JoinPrimaryButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  function JoinPrimaryButton({ className, type = 'submit', disabled, ...props }, ref) {
    // A tap on the server markup would be a native GET submit: page reload, typed name gone.
    const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || !hydrated}
        className={cn(
          'flex min-h-14 w-full items-center justify-center gap-2 rounded-neo border-3 border-neo-black bg-neo-lime px-6 py-3 font-neo-display text-xl font-black uppercase tracking-wide text-neo-navy shadow-hard',
          'transition-transform duration-100 motion-safe:active:translate-x-0.5 motion-safe:active:translate-y-0.5 active:shadow-hard-sm',
          'focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-neo-cyan',
          'disabled:cursor-not-allowed disabled:opacity-45 lg:min-h-16 lg:text-2xl',
          className
        )}
        {...props}
      />
    );
  }
);
