'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useMpShellLock } from './useMpShellLock';

export interface MpScreenProps {
  header?: ReactNode;
  body: ReactNode;
  footer?: ReactNode;
  testId: string;
  /**
   * `none` (default): the body clips — the screen must be designed to fit.
   * `inner`: the body region scrolls on its own; the page never does.
   */
  bodyScroll?: 'none' | 'inner';
  className?: string;
  bodyClassName?: string;
}

/**
 * The one frame every multiplayer state renders in: header / body / footer on
 * a `grid-rows-[auto_minmax(0,1fr)_auto]` that fills PageClient's flex-fit body
 * (which already reserves banner height, so banners never cover the footer).
 *
 * - Not `fixed`: only the TV projector views may be fixed.
 * - Dark-only surface: hardcoded `bg-neo-navy` (a cream/dark pair flashes cream
 *   on lazy mounts — pitfall class 5).
 * - No entrance opacity tween: it appears statically; only children animate.
 * - Density is CSS-only: `.mp-screen` sets `--mp-u` (1, or 1.5 on the `tv:`
 *   variant) — every HUD size is `calc(Npx*var(--mp-u))`. No JS density hook
 *   for first paint (pitfall class 1).
 * - Global nav hiding is NOT done here: PageClient is its single writer.
 */
export function MpScreen({ header, body, footer, testId, bodyScroll = 'none', className, bodyClassName }: MpScreenProps) {
  useMpShellLock();
  return (
    <div
      data-testid={testId}
      data-mp-screen=""
      className={cn(
        'mp-screen relative flex-1 h-full min-h-0 w-full grid grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-neo-navy text-neo-white',
        'ps-[env(safe-area-inset-left)] pe-[env(safe-area-inset-right)]',
        className,
      )}
    >
      {header ? (
        <div data-testid={`${testId}-header`} className="min-w-0">
          {header}
        </div>
      ) : (
        <div aria-hidden="true" />
      )}
      <div
        data-testid={`${testId}-body`}
        className={cn(
          'min-h-0 min-w-0 flex flex-col',
          bodyScroll === 'inner' ? 'overflow-y-auto overflow-x-hidden overscroll-contain' : 'overflow-hidden',
          bodyClassName,
        )}
      >
        {body}
      </div>
      {footer ? (
        <div data-testid={`${testId}-footer`} className="min-w-0 pb-[env(safe-area-inset-bottom)]">
          {footer}
        </div>
      ) : (
        <div aria-hidden="true" />
      )}
    </div>
  );
}
