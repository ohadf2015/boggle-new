import { memo } from 'react';
import type { ShellSlots } from './types';

interface MultiplayerDesktopShellProps {
  slots: ShellSlots;
}

/**
 * Three-column desktop shell. Mounts only on desktop (caller-gated via
 * `useDesktopShellEnabled`). A `@container` query gates the 3-col layout at
 * ≥1024px container width — below that, columns stack so iframe / admin frame
 * embeds collapse gracefully without forcing a horizontal scroll.
 *
 * RTL safety: only logical/symmetric Tailwind classes (gap-, flex-, grid-cols-)
 * are used. No `ml-*` / `mr-*` / `pl-*` / `pr-*` — Tailwind's RTL plugin handles
 * the rest automatically when `dir="rtl"` is set on `<html>`.
 */
export const MultiplayerDesktopShell = memo<MultiplayerDesktopShellProps>(({ slots }) => {
  return (
    <div className="@container w-full h-full" data-mp-shell-root>
      <div
        data-mp-shell
        className="grid gap-4 p-4 h-full grid-cols-1 @[1024px]:grid-cols-[minmax(220px,1fr)_minmax(540px,720px)_minmax(220px,1fr)]"
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
