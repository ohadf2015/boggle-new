'use client';

import { type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useEducationShellLock, EDUCATION_SHELL_LOCK_CLASS } from './useEducationShellLock';
import { resolveEducationNav } from './navItems';
import { EducationShellNav } from './EducationShellNav';

export { EDUCATION_SHELL_LOCK_CLASS };

/**
 * EducationShell — the page body never scrolls; exactly one inner region does.
 *
 * Every teacher and student CRUD screen used to scroll the whole document:
 * `<body>` carries `.screen-fit` (`min-height:100dvh; overflow-y:auto`) and
 * each page opened with `min-h-screen`, so a report, a roster and a profile
 * all grew the page instead of their own panel. On a projector that pushes
 * the join code off the top of the room's view; on a phone it means the
 * teacher's ONE button slides away under a thumb-scroll.
 *
 * `ProjectorLobby`/`ProjectorRoster` already solved this locally (fixed root,
 * `min-h-0 flex-1` middle, `overflow-y-auto` inner). This generalises that
 * into the one shell every such screen mounts:
 *
 *   header      shrink-0   — compact chrome, always visible
 *   statusRow   shrink-0   — ONE slim line (plan, greeting, live class)
 *   hero        shrink-0   — the dominant action, never scrolled away
 *   children    flex-1 min-h-0 overflow-y-auto — the only scroller
 *   footer      shrink-0   — docked actions
 *
 * Dark-only by construction: `bg-neo-navy` is hardcoded, never the
 * `bg-neo-cream dark:bg-neo-navy` pair, which flashes cream on a lazy mount
 * before the dark class resolves (pitfall class 5).
 *
 * Motion: nothing here tweens. The resting state paints in full on first
 * frame — entrance opacity on a full-viewport layer is exactly the mobile
 * flash this codebase keeps re-learning about.
 */
export interface EducationShellProps {
  /** The only scrolling region. */
  children: ReactNode;
  /** Compact chrome — the page passes its own `<EducationHeader />`. Kept a
   *  slot rather than a hardcoded import so the shell stays free of context
   *  dependencies and can be unit-tested without providers. */
  header?: ReactNode;
  /** At most ONE slim line above the hero — never a stack of banners. */
  statusRow?: ReactNode;
  /** The dominant panel, pinned above the scroll region. */
  hero?: ReactNode;
  /** Docked actions below the scroll region. */
  footer?: ReactNode;
  /** Accessible name for the scroll region. */
  scrollRegionLabel?: string;
  className?: string;
  /** Applied to the scroll region (padding, max-width wrappers live here). */
  contentClassName?: string;
  /** Escape hatch for a screen that must render its own root (tests, portals). */
  'data-testid'?: string;
}

export function EducationShell({
  children,
  header,
  statusRow,
  hero,
  footer,
  scrollRegionLabel,
  className,
  contentClassName,
  'data-testid': testId = 'education-shell',
}: EducationShellProps) {
  useEducationShellLock();
  // Derived here, not passed in: nine screens mount this shell and one of them
  // (student/profile) sits on its line ceiling with nothing to spare for a prop.
  const nav = resolveEducationNav(usePathname());

  return (
    <div
      data-testid={testId}
      className={cn(
        // h-dvh (not min-h) + overflow-hidden is the half of the contract the
        // body lock cannot provide: it stops THIS subtree growing the page.
        'flex h-dvh w-full flex-col overflow-hidden bg-neo-navy',
        className,
      )}
    >
      {header ? (
        // `flex-shrink` defaults to 1, so a bare header band is the first thing
        // a tall column squeezes — the back button and locale switcher would
        // lose height while the one child that can actually scroll instead does
        // not give up a pixel.
        <div data-testid="education-shell-header" className="shrink-0">
          {header}
        </div>
      ) : null}

      {/* Desktop puts the sidebar beside the content column; this row is the
          part that flexes, and it never scrolls itself. */}
      <div data-testid="education-shell-body" className="flex min-h-0 flex-1">
        {nav ? <EducationShellNav nav={nav} variant="sidebar" /> : null}

        <div className="flex min-h-0 flex-1 flex-col">
          {statusRow ? (
            <div data-testid="education-shell-status" className="shrink-0">
              {statusRow}
            </div>
          ) : null}

          {hero ? (
            <div data-testid="education-shell-hero" className="shrink-0">
              {hero}
            </div>
          ) : null}

          {/* min-h-0 is load-bearing: without it a flex child refuses to shrink
              below its content, the region never overflows, and the page grows. */}
          <div
            data-testid="education-shell-scroll"
            aria-label={scrollRegionLabel}
            className={cn(
              // `edu-shell-scroll` is the hook globals.css uses to move the cookie
          // sheet's height reservation off <body> and onto this region.
          'edu-shell-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]',
              contentClassName,
            )}
          >
            {children}
          </div>

          {footer ? (
            <div data-testid="education-shell-footer" className="shrink-0">
              {footer}
            </div>
          ) : null}
        </div>
      </div>

      {/* Laid out in the column, never fixed over it: a fixed bar would keep
          scrollHeight === innerHeight true while hiding the last row of
          content underneath itself. */}
      {nav ? <EducationShellNav nav={nav} variant="tabs" /> : null}
    </div>
  );
}

export default EducationShell;
