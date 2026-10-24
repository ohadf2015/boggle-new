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
  /** Settings open: hide the pinned poster and give the scroller the height. */
  expanded?: boolean;
  className?: string;
}

export function ClassroomLobbyShell({ pinned, children, footer, expanded, className }: ClassroomLobbyShellProps) {
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
      {/* Centred, and capped at a readable column. `justify-center` only does
          anything because the scroller below is `shrink` rather than `flex-1`:
          a short lobby sits in the middle of a 900px desktop instead of
          stranding 500px of empty navy under it, and a tall one still gets its
          own scrollbar without ever handing the scroll to the page. */}
      <div className="mx-auto flex w-full max-w-3xl min-h-0 flex-1 flex-col justify-center-safe gap-2 px-1 py-1 lg:max-w-5xl lg:gap-3">
        {/* The stage line is information, not an action. The title used to be
            a yellow bordered slab that read as a second START button beside
            GO LIVE — two CTAs for one job. It stays as the page's h1 for
            screen readers; GO LIVE in the spotlight is the only call to action. */}
        <header className="flex shrink-0 justify-center text-center">
          <h1 data-testid="lobby-stage-title" className="sr-only">
            {tr(t, 'academy.launch.title', 'Start a live game')}
          </h1>
          <p
            data-testid="lobby-stage-subtitle"
            className="rounded-full bg-neo-navy/85 px-3 py-0.5 font-neo-body text-xs font-bold text-neo-cream lg:px-4 lg:py-1 lg:text-lg"
          >
            {tr(t, 'academy.launch.subtitle', 'Pick a game. Your class joins with one code.')}
          </p>
        </header>

        {/* Options open = the poster steps aside (hidden, still mounted so no state resets): the settings need the whole height, not the 100px under a tall poster. */}
        <div data-testid="lobby-pinned" className={cn('shrink-0', expanded && 'hidden')}>
          {pinned}
        </div>

        <div
          data-testid="lobby-scroll"
          ref={scrollRef}
          className={cn(
            'min-h-0 overflow-y-auto overscroll-contain px-0.5 pb-1',
            expanded ? 'flex-1' : 'shrink'
          )}
        >
          {children}
        </div>
      </div>

      {footer ? (
        <div className="shrink-0 border-t-[3px] border-neo-cream bg-neo-navy-light px-1 py-3">{footer}</div>
      ) : null}
    </div>
  );
}

export default ClassroomLobbyShell;
