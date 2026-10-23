'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ControlTone = 'go' | 'time' | 'neutral' | 'danger' | 'armed';

const TONE_CLASSES: Record<ControlTone, string> = {
  go: 'bg-neo-lime text-neo-black',
  time: 'bg-neo-white text-neo-black',
  neutral: 'bg-neo-white text-neo-black',
  // Destructive-secondary: an outline until armed, so it never outweighs Pause.
  danger: 'bg-neo-cream text-neo-black border-neo-red shadow-none lg:shadow-none [&_svg]:text-neo-red',
  // No `animate-pulse`: the app-wide pulse keyframes scale the box, so the
  // confirm tap would chase a moving target.
  armed: 'bg-neo-red text-neo-white ring-4 ring-neo-yellow',
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
  /** While set, a bar drains across the button over this many ms. */
  drainMs?: number;
  drainTestId?: string;
  className?: string;
}

function DrainBar({ ms, testId }: { ms: number; testId?: string }) {
  const [draining, setDraining] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDraining(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <span
      aria-hidden="true"
      data-testid={testId}
      className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 lg:h-2 origin-left rtl:origin-right bg-neo-yellow"
      style={{ transform: `scaleX(${draining ? 0 : 1})`, transition: `transform ${ms}ms linear` }}
    />
  );
}

/** Height + type ladder for a projector, and the flat fallback for a short window. */
const FULL_SIZE = [
  'min-h-[56px] sm:min-h-[60px] lg:min-h-[72px] xl:min-h-[80px] tv:min-h-[92px]',
  'px-4 sm:px-5 lg:px-6 xl:px-8 tv:px-9',
  'text-base sm:text-lg lg:text-lg xl:text-xl 2xl:text-2xl tv:text-3xl leading-none',
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
  drainMs,
  drainTestId,
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
        // One row from `lg` (`lg:flex-nowrap`): a long label takes more lines, never a cut word.
        'relative overflow-hidden inline-flex min-w-0 lg:min-w-min items-center justify-center',
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
      <span className="line-clamp-2 min-w-0 text-balance text-center leading-[1.05] [overflow-wrap:anywhere] lg:line-clamp-none lg:[overflow-wrap:normal]">{label}</span>
      {drainMs ? <DrainBar ms={drainMs} testId={drainTestId} /> : null}
    </button>
  );
}

export default ControlButton;
