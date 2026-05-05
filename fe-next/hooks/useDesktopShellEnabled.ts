import { useIsDesktop } from './useMediaQuery';
import { useExperiment } from './useExperiment';

/**
 * Gates `MultiplayerDesktopShell` mounting.
 * Returns true when viewport ≥768px (Tailwind `md` breakpoint via `useIsDesktop`)
 * AND the kill-switch flag `mp.desktop-shell.v1` is 'on' (or undefined → graceful default).
 *
 * Container-query gate at ≥1024px is enforced inside the shell stylesheet itself,
 * so this hook only handles the viewport + flag gating.
 *
 * Why graceful-default-on: this is a kill-switch, not a rollout flag. If PostHog
 * fails to fetch, we want desktop users to still see the shell (the new default UI),
 * not be sent back to the legacy mobile-stacked layout.
 */
export function useDesktopShellEnabled(): boolean {
  const isDesktop = useIsDesktop();
  const { variant } = useExperiment('mp.desktop-shell.v1');
  const flagOn = variant !== 'off';
  return isDesktop && flagOn;
}
