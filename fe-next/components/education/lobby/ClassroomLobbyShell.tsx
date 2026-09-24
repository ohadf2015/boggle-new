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

import type { ReactNode } from 'react';
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
  className?: string;
}

export function ClassroomLobbyShell({ pinned, children, footer, className }: ClassroomLobbyShellProps) {
  const { t } = useLanguage();
  return (
    <div
      data-testid="classroom-lobby-shell"
      // Transparent on purpose: the route paints `bg-neo-navy` and the arena
      // art (LaunchStageBackdrop) behind this shell.
      className={cn('relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden', className)}
    >
      {/* Centred, and capped at a readable column. `justify-center` only does
          anything because the scroller below is `shrink` rather than `flex-1`:
          a short lobby sits in the middle of a 900px desktop instead of
          stranding 500px of empty navy under it, and a tall one still gets its
          own scrollbar without ever handing the scroll to the page. */}
      <div className="mx-auto flex w-full max-w-3xl min-h-0 flex-1 flex-col justify-center gap-3 px-1 py-2 lg:max-w-4xl lg:gap-4">
        {/* The stage title: what this screen is for, in one line, on a
            show-card — the arena behind it says the rest. */}
        <header className="flex shrink-0 flex-col items-center gap-1 text-center">
          <h1
            data-testid="lobby-stage-title"
            className="-rotate-1 rounded-neo border-[3px] border-neo-black bg-neo-yellow px-4 py-1 font-neo-display text-2xl font-black uppercase leading-tight tracking-tight text-neo-black shadow-hard lg:px-6 lg:text-5xl"
          >
            {tr(t, 'academy.launch.title', 'Start a live game')}
          </h1>
          <p className="rounded-full bg-neo-navy/85 px-3 py-0.5 font-neo-body text-sm font-bold text-neo-cream lg:text-lg">
            {tr(t, 'academy.launch.subtitle', 'Pick a game. Your class joins with one code.')}
          </p>
        </header>

        <div className="shrink-0">{pinned}</div>

        <div
          data-testid="lobby-scroll"
          className="min-h-0 shrink overflow-y-auto overscroll-contain px-0.5 pb-1"
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
