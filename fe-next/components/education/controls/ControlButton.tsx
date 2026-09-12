'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ControlTone = 'go' | 'time' | 'neutral' | 'danger' | 'armed';

const TONE_CLASSES: Record<ControlTone, string> = {
  go: 'bg-neo-lime text-neo-black',
  time: 'bg-neo-yellow text-neo-black',
  neutral: 'bg-neo-cyan text-neo-black',
  // Black, not white: white on neo-pink measures 3.64:1, under the 4.5:1 the
  // contrast sweep enforces (flagged on the quiz projector, 1440x900).
  danger: 'bg-neo-pink text-neo-black',
  armed: 'bg-neo-red text-neo-white animate-pulse',
};

interface ControlButtonProps {
  tone: ControlTone;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  testId: string;
  ariaPressed?: boolean;
  dataArmed?: boolean;
  /**
   * The viewport is too short to carry full-size controls — see
   * `useShortViewport`. One flat size instead of the responsive ladder, so the
   * strip gives its extra height back to the game surface.
   */
  compact?: boolean;
  className?: string;
}

/** Height + type ladder for a projector, and the flat fallback for a short window. */
const FULL_SIZE = [
  'min-h-[56px] sm:min-h-[60px] lg:min-h-[72px] xl:min-h-[80px] tv:min-h-[92px]',
  'px-4 sm:px-5 lg:px-6 xl:px-8 tv:px-9',
  'text-base sm:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl tv:text-4xl leading-none',
  'gap-2 lg:gap-3 tv:gap-4',
].join(' ');

const COMPACT_SIZE = 'min-h-[56px] px-4 text-base lg:text-lg leading-none gap-2';

/**
 * One control in the teacher strip.
 *
 * Sized for two different rooms at once: a phone held in one hand (56px, the
 * comfortable-target floor, not the 44px minimum) and a projector read from the
 * back row (the `tv:` breakpoint is 1920px — everything steps up there).
 */
export function ControlButton({
  tone,
  icon,
  label,
  onClick,
  testId,
  ariaPressed,
  dataArmed,
  compact = false,
  className,
}: ControlButtonProps) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-pressed={ariaPressed}
      data-armed={dataArmed === undefined ? undefined : dataArmed ? 'true' : 'false'}
      onClick={onClick}
      className={cn(
        // `min-w-0` + a truncating label is what lets five controls hold ONE row
        // from `lg` up (the bar sets `lg:flex-nowrap`): a long label in Hebrew or
        // Russian shortens instead of wrapping the strip into a second row that
        // would eat a third of the projector.
        'inline-flex min-w-0 items-center justify-center',
        'rounded-neo border-3 lg:border-4 border-neo-black shadow-hard lg:shadow-hard-lg',
        'font-neo-display font-black uppercase tracking-wide',
        // A classroom projector is usually 1280-1920px wide and read from 5m —
        // the size has to step up well before the 1920px `tv:` breakpoint.
        compact ? COMPACT_SIZE : FULL_SIZE,
        'transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2',
        TONE_CLASSES[tone],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'shrink-0 [&>svg]:h-5 [&>svg]:w-5',
          !compact && 'lg:[&>svg]:h-7 lg:[&>svg]:w-7 xl:[&>svg]:h-8 xl:[&>svg]:w-8 tv:[&>svg]:h-10 tv:[&>svg]:w-10',
        )}
      >
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

export default ControlButton;
