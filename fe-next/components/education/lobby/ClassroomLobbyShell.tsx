/**
 * The lobby's frame: the shell locks and exactly one region scrolls (`<body>` is `.screen-fit` app-wide).
 * Columns follow the shell's own width (`@container/lobby`), so a preview frame or the TV zoom lays out right.
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
  /** The ready panel: a side column from lg, a dock under the scroller on phones. Never scrolls, never hides. */
  aside?: ReactNode;
  className?: string;
}

export function ClassroomLobbyShell({ pinned, children, footer, aside, className }: ClassroomLobbyShellProps) {
  const { t, dir } = useLanguage();
  return (
    <div
      data-testid="classroom-lobby-shell"
      dir={dir}
      // Transparent on purpose: the route paints `bg-neo-navy` and the arena
      // art (LaunchStageBackdrop) behind this shell.
      className={cn('@container/lobby relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden', className)}
    >
      <div className="mx-auto flex w-full max-w-[1400px] min-h-0 flex-1 flex-col gap-2 px-1 py-1 @4xl/lobby:gap-3 @4xl/lobby:px-4">
        {/* The h1 is for screen readers; the visible line is information, so GO LIVE stays the only call to action. */}
        <header className="flex shrink-0 justify-center text-center @4xl/lobby:justify-start @4xl/lobby:text-start">
          <h1 data-testid="lobby-stage-title" className="sr-only">
            {tr(t, 'academy.launch.title', 'Start a live game')}
          </h1>
          <p
            data-testid="lobby-stage-subtitle"
            className="rounded-full bg-neo-navy/85 px-3 py-0.5 font-neo-body text-xs font-bold text-neo-cream @4xl/lobby:px-4 @4xl/lobby:py-1 @4xl/lobby:text-base"
          >
            {tr(t, 'academy.launch.subtitle', 'Pick a game. Your class joins with one code.')}
          </p>
        </header>

        <div data-testid="lobby-columns" className="flex min-h-0 flex-1 flex-col gap-2 @4xl/lobby:grid @4xl/lobby:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)] @4xl/lobby:gap-5">
          <div className="flex min-h-0 flex-1 flex-col gap-2 @4xl/lobby:gap-3">
            <div data-testid="lobby-pinned" className="shrink-0 empty:hidden">
              {pinned}
            </div>
            <div
              data-testid="lobby-scroll"
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-0.5 pb-2"
            >
              {children}
            </div>
          </div>

          {aside ? (
            <div data-testid="lobby-aside" className="shrink-0 @4xl/lobby:flex @4xl/lobby:min-h-0 @4xl/lobby:flex-col">
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
