'use client';

/**
 * GameStage — shared no-scroll viewport shell for single-player mini-games.
 *
 * Why it exists: the old `min-h-[100dvh] px-4 py-8` + `space-y-*` document
 * pattern lets the page body scroll once the play content (a growing word
 * chain, an on-screen keyboard pushing layout) exceeds the viewport. That is
 * the root cause of "in-game screen scroll" across shiritori / word-alchemy /
 * sealed-bid. GameStage caps the shell to exactly one viewport
 * (`h-[100dvh] overflow-hidden flex flex-col`) and confines scrolling to the
 * middle body region, so the header (HUD) and footer (input/controls) stay
 * pinned while only the play area scrolls when it must.
 *
 * Safe-area insets keep the footer above the home indicator / notch on phones.
 * RTL is inherited from the ancestor `dir` attribute — no per-side logic here.
 */

import type { ReactNode } from 'react';

type GameAccent = 'lime' | 'pink' | 'cyan' | 'purple' | 'orange';

interface GameStageProps {
  /** Scrollable play area — the only region allowed to overflow. */
  children: ReactNode;
  /** Pinned top slot (HUD, title, difficulty, prompt). */
  header?: ReactNode;
  /** Pinned bottom slot (text input, keyboard, action buttons). */
  footer?: ReactNode;
  /** Mode accent — exposed as `data-accent` for themed glows / future styling. */
  accent?: GameAccent;
  /** Extra classes merged onto the root shell. */
  className?: string;
  /** Optional accessible label for the play region. */
  bodyLabel?: string;
}

export function GameStage({
  children,
  header,
  footer,
  accent,
  className = '',
  bodyLabel,
}: GameStageProps) {
  return (
    <main
      data-accent={accent}
      className={`fixed inset-x-0 top-0 z-20 flex h-[100dvh] flex-col overflow-hidden bg-neo-navy texture-halftone ${className}`}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      {header && (
        <div data-testid="game-stage-header" className="shrink-0 px-4 pt-3">
          {header}
        </div>
      )}

      <div
        data-testid="game-stage-body"
        aria-label={bodyLabel}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-3"
      >
        {children}
      </div>

      {footer && (
        <div
          data-testid="game-stage-footer"
          className="shrink-0 px-4 pt-2"
          style={{
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
          }}
        >
          {footer}
        </div>
      )}
    </main>
  );
}
