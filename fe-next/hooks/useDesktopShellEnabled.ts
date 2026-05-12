import { useMediaQuery } from './useMediaQuery';
import { useExperiment } from './useExperiment';

/**
 * Gates `MultiplayerDesktopShell` mounting.
 * Returns true when viewport ≥1024px (Tailwind `lg` breakpoint) AND the
 * kill-switch flag `mp.desktop-shell.v1` is 'on' (or undefined → graceful default).
 *
 * The shell's internal layout uses `@[1024px]:grid-cols-3`, so below 1024px the
 * shell collapses to a single-column stack — that mode pushes the mode-badge
 * timer above the board and visually overlaps the grid (see 910×653 viewport
 * report). Aligning the mount gate with the @container breakpoint avoids the
 * broken intermediate state and falls back to the legacy `PortraitLayout`
 * (which renders its own in-row timer sized for tablet/mobile).
 */
export function useDesktopShellEnabled(): boolean {
  const isLgUp = useMediaQuery('(min-width: 1024px)');
  const { variant } = useExperiment('mp.desktop-shell.v1');
  const flagOn = variant !== 'off';
  return isLgUp && flagOn;
}
