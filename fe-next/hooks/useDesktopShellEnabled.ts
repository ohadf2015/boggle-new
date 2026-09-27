import { useMediaQuery } from './useMediaQuery';
import { useExperiment } from './useExperiment';

/**
 * Gates `MultiplayerDesktopShell` mounting.
 * Returns true when viewport ≥1024px (Tailwind `lg` breakpoint) AND the
 * kill-switch flag `mp.desktop-shell.v1` is 'on' (or undefined → graceful default).
 *
 * The shell's internal 3-col layout is a `@container` query (`@[960px]`). The
 * 960px breakpoint + the min track sum (964px) are both kept ≤ viewport−32px
 * (an ancestor adds `md:p-4`), so once this gate mounts the shell at viewport
 * ≥1024 the 3-col layout fires immediately — no dead band where the shell is
 * mounted but stacked single-column (which pushed the timer above the board and
 * overlapped the grid; see 910×653 viewport report + MultiplayerDesktopShell
 * geometry test). Below 1024px we fall back to the legacy `PortraitLayout`
 * (which renders its own in-row timer sized for tablet/mobile).
 */
export function useDesktopShellEnabled(): boolean {
  const isLgUp = useMediaQuery('(min-width: 1024px)');
  const { variant } = useExperiment('mp.desktop-shell.v1');
  const flagOn = variant !== 'off';
  return isLgUp && flagOn;
}
