'use client';

/**
 * The frame every Academy sub-page (Lessons, Awards) sits in, so opening one
 * from the map's dock doesn't feel like a different app:
 *  - the map art, blurred and darkened, as the ground (dark-only: bg-neo-navy);
 *  - an ink plaque on top with a way back to the map and the page title;
 *  - ONE ink panel that owns all the scrolling — the page itself never scrolls;
 *  - the map's own dock at the bottom (in the top row on a phone on its side).
 *
 * Layout modes are the hub's (`pickHubLayout`), so the frame and the map switch
 * at the same sizes. Big screens scale the whole frame with `zoom` on a box
 * sized in % (percentages are not zoomed, so it still fills the viewport).
 */

import { useLayoutEffect, useState, type ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { pickHubLayout, type HubLayout } from '@/components/student/academy/hubLayout';
import { AcademyDock } from '@/components/student/academy/AcademyDock';
import { InkPanel } from '@/components/student/academy/chrome';
import { AcademyBackdrop } from '@/components/student/academy/AcademyBackdrop';
import { AcademyPlaque } from '@/components/student/academy/AcademyPlaque';
import { cn } from '@/lib/utils';

/** SSR / pre-hydration size: the phone design (the frame is server-rendered while auth resolves). */
const SSR_VIEW = { width: 390, height: 844 };

/**
 * The hub's layout rule, but hydration-safe: this frame IS server-rendered (the
 * pending state), so the first client render must match the server's, and the
 * real viewport is applied in a layout effect before the first paint.
 */
function useFrameLayout(): { layout: HubLayout; scale: number } {
  const [view, setView] = useState(SSR_VIEW);
  useLayoutEffect(() => {
    const update = () => setView((v) => (v.width === window.innerWidth && v.height === window.innerHeight ? v : { width: window.innerWidth, height: window.innerHeight }));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  const layout = pickHubLayout(view);
  return { layout, scale: frameScale(layout, view.width, view.height) };
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Frame zoom: the phone design is the 1x; desktops/TVs grow with the smaller axis. */
export function frameScale(layout: HubLayout, width: number, height: number): number {
  if (layout.chrome === 'wide') return Math.round(clamp(Math.min(width / 1366, height / 768), 1, 1.9) * 100) / 100;
  if (layout.chrome === 'stack') return Math.round(clamp(Math.min(width / 430, height / 900), 1, 1.35) * 100) / 100;
  return 1;
}

interface Props {
  /** Page title shown on the plaque. */
  title: string;
  /** Painted icon beside the title (an academy art file). */
  art: string;
  /** Small chip at the end of the plaque (a count, a total). */
  badge?: ReactNode;
  /** Row between the plaque and the list (filters). Stays put while the list scrolls. */
  toolbar?: ReactNode;
  /** Accessible name of the scrolling list region. */
  regionLabel: string;
  pending?: boolean;
  /** Ready, but the list itself is still loading. */
  busy?: boolean;
  children: ReactNode;
}

export function AcademyPageFrame({ title, art, badge, toolbar, regionLabel, pending = false, busy = false, children }: Props) {
  const { language, dir } = useLanguage() as { language: string; dir?: string };
  const { layout, scale } = useFrameLayout();
  const rail = layout.chrome === 'rail';
  const wide = layout.chrome === 'wide';

  const dock = <AcademyDock locale={language} reviewCount={0} big={wide} iconOnly={rail} />;

  return (
    <div
      dir={dir ?? (language === 'he' ? 'rtl' : 'ltr')}
      data-testid={pending ? 'academy-page-pending' : 'academy-page'}
      data-chrome={layout.chrome}
      className="fixed inset-0 isolate overflow-hidden bg-edu-page text-edu-ink"
    >
      <AcademyBackdrop art="map" />

      <div
        className={cn(
          'absolute start-0 top-0 flex flex-col',
          rail
            ? 'gap-1.5 ps-[max(0.5rem,env(safe-area-inset-left,0px))] pe-[max(0.5rem,env(safe-area-inset-right,0px))] pb-[calc(env(safe-area-inset-bottom,0px)+0.375rem)] pt-[calc(env(safe-area-inset-top,0px)+0.375rem)]'
            : 'gap-2.5 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] sm:px-6 sm:pb-5 sm:pt-4',
        )}
        style={{ width: '100%', height: '100%', ...(scale !== 1 ? { zoom: scale } : {}) }}
      >
        <div className={cn('mx-auto flex w-full shrink-0 items-center gap-2', wide ? 'max-w-6xl' : 'max-w-3xl', rail && 'max-w-none')}>
          <AcademyPlaque title={title} art={art} badge={badge} compact={rail} />
          {rail && <div className="shrink-0">{dock}</div>}
        </div>

        <InkPanel
          as="section"
          tone="night"
          aria-label={regionLabel}
          aria-busy={pending || busy || undefined}
          className={cn('mx-auto flex min-h-0 w-full flex-1 flex-col', wide ? 'max-w-6xl' : 'max-w-3xl', rail && 'max-w-none')}
        >
          {toolbar && <div className={cn('shrink-0 border-b-3 border-edu-line', rail ? 'px-2.5 py-1.5' : 'px-3 py-2.5 sm:px-4')}>{toolbar}</div>}
          {/* The ONE scroller. Rounded clip so cards never paint over the ink edge. */}
          <div
            data-testid="academy-page-scroll"
            className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-b-[15px]', !toolbar && 'rounded-t-[15px]', rail ? 'p-2.5' : 'p-3 sm:p-4')}
          >
            {children}
          </div>
        </InkPanel>

        {!rail && <div className={cn('mx-auto shrink-0', wide ? 'w-auto' : 'w-full max-w-xl')}>{dock}</div>}
      </div>
    </div>
  );
}

/** Pulsing placeholder cards for the pending state (the frame is already real). */
export function FrameSkeleton({ rows = 4, grid = false }: { rows?: number; grid?: boolean }) {
  return (
    <div className={grid ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4' : 'flex flex-col gap-3'}>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className={cn('rounded-[16px] bg-edu-ink/10 motion-safe:animate-pulse', grid ? 'h-36' : 'h-20')}
        />
      ))}
    </div>
  );
}
