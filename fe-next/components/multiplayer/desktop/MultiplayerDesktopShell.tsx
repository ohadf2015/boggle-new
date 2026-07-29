import { memo, useMemo } from 'react';
import type { ShellSlots } from './types';
import { getCurrentSeasonDynamic } from '@/lib/seasons';

interface MultiplayerDesktopShellProps {
  slots: ShellSlots;
}

/**
 * Three-column desktop shell. Mounts only on desktop (caller-gated via
 * `useDesktopShellEnabled`, viewport ≥1024px). A `@container` query gates the
 * 3-col layout — below that, columns stack so iframe / admin frame embeds
 * collapse gracefully without forcing a horizontal scroll.
 *
 * Breakpoint geometry (why @[960px] and these min tracks): the mount gate is a
 * *viewport* query but this switch is a *container* query, and an ancestor
 * (PlayerInGameView) adds `md:p-4` = 32px, so the container is viewport−32 at
 * the mount threshold (≈992px when the viewport is 1024px). The breakpoint and
 * the min track sum (200+500+200 + gap-4×2 + p-4×2 = 964px) both stay ≤992 so
 * the 3-col layout fires cleanly the moment the shell mounts — no dead band
 * where the shell is up but stacked single-column (the "grid alone on a wide
 * screen" symptom). See MultiplayerDesktopShell.test.tsx for the contract.
 *
 * RTL safety: only logical/symmetric Tailwind classes (gap-, flex-, grid-cols-)
 * are used. No `ml-*` / `mr-*` / `pl-*` / `pr-*` — Tailwind's RTL plugin handles
 * the rest automatically when `dir="rtl"` is set on `<html>`.
 */
export const MultiplayerDesktopShell = memo<MultiplayerDesktopShellProps>(({ slots }) => {
  // Subtle seasonal ambience behind the desktop match shell (transparent root,
  // so the accent wash shows over the page background for every desktop MP mode).
  const seasonSkin = useMemo(() => getCurrentSeasonDynamic().gridSkinClass, []);
  return (
    <div className={`@container w-full h-full ${seasonSkin}`} data-mp-shell-root>
      <div
        data-mp-shell
        className="grid gap-4 p-4 h-full grid-cols-1 @[960px]:grid-cols-[minmax(200px,1fr)_minmax(500px,720px)_minmax(200px,1fr)]"
      >
        {/* Left rail */}
        <aside className="flex flex-col gap-3 min-w-0" data-slot="left">
          <div data-slot="left-mode-badge">{slots.left.modeBadge}</div>
          <div data-slot="left-roster" className="flex-1 min-h-0">{slots.left.roster}</div>
          <div data-slot="left-secondary" aria-hidden={!slots.left.secondary}>
            {slots.left.secondary ?? <span className="opacity-30">—</span>}
          </div>
        </aside>

        {/* Center canvas */}
        <main className="min-w-0 flex items-stretch justify-center" data-slot="center">
          {slots.center}
        </main>

        {/* Right rail */}
        <aside className="flex flex-col gap-3 min-w-0" data-slot="right">
          <div data-slot="right-ladder" className="flex-1 min-h-0">{slots.right.wordsLadder}</div>
          {slots.right.activityStream ? (
            <div data-slot="right-stream">{slots.right.activityStream}</div>
          ) : null}
          {slots.right.chat ? (
            <div data-slot="right-chat">{slots.right.chat}</div>
          ) : null}
        </aside>
      </div>
    </div>
  );
});
MultiplayerDesktopShell.displayName = 'MultiplayerDesktopShell';
