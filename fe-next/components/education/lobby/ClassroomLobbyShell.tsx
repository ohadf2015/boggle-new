/**
 * The lobby's frame: the shell locks and exactly one region scrolls (`<body>` is `.screen-fit` app-wide).
 * One column: a short setup line on top, the ready panel filling the rest. Anything in the scroller that
 * marks itself `data-lobby-expanded` flips that: the scroller takes the height and the panel shrinks to its Start.
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
  /** The ready panel under the scroller. Never scrolls, never hides. */
  aside?: ReactNode;
  className?: string;
}

export function ClassroomLobbyShell({ pinned, children, footer, aside, className }: ClassroomLobbyShellProps) {
  const { t, dir } = useLanguage();
  return (
    <div
      data-testid="classroom-lobby-shell"
      dir={dir}
      className={cn('group/lobby @container/lobby relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-edu-page', className)}
    >
      <div className="mx-auto flex w-full max-w-[1200px] min-h-0 flex-1 flex-col gap-2 px-1 py-1 @4xl/lobby:gap-3 @4xl/lobby:px-4">
        {/* The h1 is for screen readers; the visible line is information, so GO LIVE stays the only call to action. */}
        <header className="flex shrink-0 justify-center text-center @4xl/lobby:justify-start @4xl/lobby:text-start">
          <h1 data-testid="lobby-stage-title" className="sr-only">
            {tr(t, 'academy.launch.title', 'Start a live game')}
          </h1>
          <p
            data-testid="lobby-stage-subtitle"
            className="hidden font-neo-body text-xs font-bold text-edu-ink/70 @lg/lobby:block @4xl/lobby:text-sm"
          >
            {tr(t, 'academy.launch.subtitle', 'Pick a game. Your class joins with one code.')}
          </p>
        </header>

        <div data-testid="lobby-columns" className="flex min-h-0 flex-1 flex-col gap-3">
          <div data-testid="lobby-pinned" className="shrink-0 empty:hidden">
            {pinned}
          </div>
          <div
            data-testid="lobby-scroll"
            className={cn(
              'min-h-0 overflow-y-auto overscroll-contain px-0.5 pb-1',
              aside ? 'flex-[0_1_auto] group-has-[[data-lobby-expanded]]/lobby:flex-1 group-has-[[data-lobby-expanded]]/lobby:[container:lobby-fill/size]' : 'flex-1 [container:lobby-fill/size]',
            )}
          >
            {children}
          </div>

          {aside ? (
            <div
              data-testid="lobby-aside"
              className="flex min-h-0 flex-1 flex-col group-has-[[data-lobby-expanded]]/lobby:flex-none [&>*:first-child]:min-h-0 [&>*:first-child]:flex-1"
            >
              {aside}
            </div>
          ) : null}
        </div>
      </div>

      {footer ? (
        <div className="shrink-0 border-t-[3px] border-edu-line bg-edu-surface px-1 py-3">{footer}</div>
      ) : null}
    </div>
  );
}

export default ClassroomLobbyShell;
