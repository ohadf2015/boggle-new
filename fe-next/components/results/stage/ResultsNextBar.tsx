'use client';

import type { ReactNode } from 'react';

interface BarAction {
  label: string;
  onClick: () => void;
  testId?: string;
}

interface ResultsNextBarProps {
  primary: BarAction & { icon?: ReactNode };
  /** Small square button beside the primary one; its label is the accessible name. */
  secondary?: BarAction & { icon: ReactNode; title?: string };
  shine?: boolean;
  /** `fixed` pins to the viewport (pages that scroll the window); `inline` sits as the last flex child. */
  placement?: 'inline' | 'fixed';
  testId?: string;
  barRef?: React.Ref<HTMLDivElement>;
}

/** The one primary "keep playing" action, pinned under the scrolling results. */
export function ResultsNextBar({
  primary,
  secondary,
  shine = false,
  placement = 'inline',
  testId = 'results-next-bar',
  barRef,
}: ResultsNextBarProps) {
  const position =
    placement === 'fixed'
      ? 'fixed inset-x-0 bottom-[var(--cookie-consent-height,0px)] z-50'
      : 'relative z-20 mb-[var(--bottom-nav-height,0px)] shrink-0';
  return (
    <div
      ref={barRef}
      className={`${position} bg-neo-navy px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5`}
      data-testid={testId}
    >
      <span
        aria-hidden="true"
        data-testid="quick-results-cta-fade"
        className="pointer-events-none absolute inset-x-0 bottom-full h-12 bg-linear-to-t from-neo-navy to-transparent"
      />
      <div className="mx-auto flex w-full max-w-md items-stretch gap-2.5">
        {secondary && (
          <button
            type="button"
            data-testid={secondary.testId}
            onClick={secondary.onClick}
            aria-label={secondary.label}
            title={secondary.title ?? secondary.label}
            className="flex h-[56px] min-h-[44px] w-[56px] shrink-0 items-center justify-center rounded-2xl border-[3px] border-neo-white/25 text-neo-cream active:translate-y-0.5"
          >
            {secondary.icon}
          </button>
        )}
        <button
          type="button"
          data-testid={primary.testId}
          onClick={primary.onClick}
          className="relative flex h-[56px] flex-1 items-center justify-center gap-2 overflow-hidden rounded-2xl border-[3px] border-black bg-neo-lime px-3 font-neo-display text-lg font-bold uppercase tracking-[0.12em] text-black shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed"
        >
          {shine && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-white/45 animate-[qp-shine_4s_ease-in-out_2.3s_infinite_both]"
            />
          )}
          {primary.icon && <span className="relative" aria-hidden="true">{primary.icon}</span>}
          <span className="relative truncate">{primary.label}</span>
        </button>
      </div>
    </div>
  );
}
