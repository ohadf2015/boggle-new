import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NB_BLOCK, NB_DARK_EDGE, NB_PANEL, NB_SMALL } from '../nb/nbStyles';
import { ProBadge } from '@/components/ui/ProBadge';

export type ProBannerTone = 'calm' | 'urgent';

/** The one Pro action on a banner: a chunky yellow button with the arcade shine. Render <ProShine /> inside it. */
export const PRO_BANNER_CTA = cn(
  NB_SMALL,
  NB_BLOCK.yellow,
  'animate-edu-shine min-h-12 shrink-0 px-5 text-base max-sm:w-full',
);

export function ProShine() {
  return <span className="edu-shine-track" aria-hidden="true" />;
}

/** Days-left as a tilted game tile: lime while there is time, pink at the end. */
export function ProCountdownTile({ count, unit, tone }: { count: number; unit: string; tone: ProBannerTone }) {
  return (
    <div
      className={cn(
        'flex min-w-[4.5rem] shrink-0 -rotate-3 flex-col items-center rounded-neo-lg border-[3px] px-2.5 py-1.5 text-center shadow-hard-lg',
        tone === 'urgent' ? NB_BLOCK.pink : NB_BLOCK.lime,
      )}
    >
      <span data-testid="trial-count" className="font-neo-display text-4xl font-black leading-none tabular-nums">
        {count}
      </span>
      <span data-testid="trial-unit" className="mt-0.5 font-neo-body text-[11px] font-black uppercase leading-tight tracking-wide">
        {unit}
      </span>
    </div>
  );
}

interface ProBannerProps {
  testId: string;
  title: ReactNode;
  body?: ReactNode;
  /** Left of the text: a countdown tile, or nothing. */
  lead?: ReactNode;
  action?: ReactNode;
  proLabel: string;
  tone?: ProBannerTone;
  onDismiss?: () => void;
  dismissLabel?: string;
  dismissTestId?: string;
  role?: 'status';
  data?: Record<`data-${string}`, string>;
  children?: ReactNode;
}

/**
 * Every Pro ask above the teacher dashboard wears this one card, so a trial
 * countdown, a reactivation and a resume-checkout read as the same product.
 */
export function ProBanner({
  testId, title, body, lead, action, proLabel, tone = 'calm', onDismiss, dismissLabel, dismissTestId, role, data, children,
}: ProBannerProps) {
  return (
    <aside
      data-testid={testId}
      data-tone={tone}
      role={role}
      {...data}
      className={cn(NB_PANEL, 'relative mt-3 overflow-visible p-4 pt-6 sm:p-5 sm:pt-6')}
    >
      <span
        aria-hidden="true"
        className={cn(
          'edu-stripes pointer-events-none absolute inset-x-0 top-0 h-2 rounded-t-[13px]',
          tone === 'urgent' ? 'bg-neo-pink' : 'bg-neo-yellow',
        )}
      />
      <ProBadge
        data-testid={`${testId}-sticker`}
        size="sm"
        label={proLabel}
        className="absolute -top-3.5 start-4 -rotate-3"
      />
      {onDismiss ? (
        <button
          type="button"
          data-testid={dismissTestId}
          onClick={onDismiss}
          aria-label={dismissLabel}
          className={cn(
            'absolute end-2 top-3 grid size-11 place-items-center rounded-neo border-2 text-neo-cream/80 transition-colors hover:bg-neo-cream/10 hover:text-neo-cream focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
            NB_DARK_EDGE,
          )}
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      ) : null}
      <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-center', onDismiss && 'sm:pe-12')}>
        <div className={cn('flex min-w-0 flex-1 items-center gap-4', onDismiss && 'pe-12 sm:pe-0')}>
          {lead}
          <div className="min-w-0">
            <h3 className="font-neo-display text-lg font-black leading-snug text-neo-cream sm:text-xl">{title}</h3>
            {body ? <div className="mt-1 font-neo-body text-sm font-semibold leading-snug text-neo-cream/80">{body}</div> : null}
            {children}
          </div>
        </div>
        {action}
      </div>
    </aside>
  );
}
