/**
 * The lobby's frame: the shell locks, exactly one region scrolls.
 *
 * `<body>` carries `.screen-fit` app-wide (`overflow-y:auto`), so any screen
 * that wants to stay put has to contain itself. This is the `ProjectorLobby`
 * pattern — `overflow-hidden` outside, `min-h-0 flex-1 overflow-y-auto` inside
 * — generalised for the setup side, so a teacher on a 390×844 phone never
 * scrolls the page out from under the mode picker.
 *
 * Dark-only: `bg-neo-navy` hardcoded, never the cream/dark pair (pitfall 5).
 */

'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { tr } from './eduText';

export interface ClassroomLobbyShellProps {
  /** Pinned above the scroller — the class line and the mode picker. */
  pinned: ReactNode;
  /** The ONE scrolling region. */
  children: ReactNode;
  /**
   * Pinned below. Optional: GO LIVE moved up beside the poster (design card
   * 03), and BACK is already the header's own arrow, so the lobby now has
   * nothing to put here — one whole bar of height given back to the picker.
   */
  footer?: ReactNode;
  /** Settings open: hide the pinned row and give the scroller the height. */
  expanded?: boolean;
  /** The ready panel: a side column from lg, a dock under the scroller on phones. Never scrolls, never hides. */
  aside?: ReactNode;
  className?: string;
}

export function ClassroomLobbyShell({ pinned, children, footer, expanded, aside, className }: ClassroomLobbyShellProps) {
  const { t, dir } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  // Toggling options changes the scroller's height; a stale scrollTop leaves the mode strip cropped.
  useEffect(() => {
    scrollRef.current?.scrollTo?.({ top: 0 });
  }, [expanded]);
  return (
    <div
      data-testid="classroom-lobby-shell"
      dir={dir}
      // Transparent on purpose: the route paints `bg-neo-navy` and the arena
      // art (LaunchStageBackdrop) behind this shell.
      className={cn('relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden', className)}
    >
      <div className="mx-auto flex w-full max-w-[1400px] min-h-0 flex-1 flex-col gap-2 px-1 py-1 lg:gap-3 lg:px-4">
        {/* The h1 is for screen readers; the visible line is information, so GO LIVE stays the only call to action. */}
        <header className="flex shrink-0 justify-center text-center lg:justify-start lg:text-start">
          <h1 data-testid="lobby-stage-title" className="sr-only">
            {tr(t, 'academy.launch.title', 'Start a live game')}
          </h1>
          <p
            data-testid="lobby-stage-subtitle"
            className="rounded-full bg-neo-navy/85 px-3 py-0.5 font-neo-body text-xs font-bold text-neo-cream lg:px-4 lg:py-1 lg:text-base"
          >
            {tr(t, 'academy.launch.subtitle', 'Pick a game. Your class joins with one code.')}
          </p>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-2 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)] lg:gap-5">
          <div className="flex min-h-0 flex-1 flex-col gap-2 lg:gap-3">
            <div data-testid="lobby-pinned" className={cn('shrink-0 empty:hidden', expanded && 'hidden')}>
              {pinned}
            </div>
            <div
              data-testid="lobby-scroll"
              ref={scrollRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-0.5 pb-2"
            >
              {children}
            </div>
          </div>

          {aside ? (
            <div data-testid="lobby-aside" className="shrink-0 lg:flex lg:min-h-0 lg:flex-col">
              {aside}
            </div>
          ) : null}
        </div>
      </div>

      {footer ? (
        <div className="shrink-0 border-t-[3px] border-neo-cream bg-neo-navy-light px-1 py-3">{footer}</div>
      ) : null}
    </div>
  );
}

export default ClassroomLobbyShell;
