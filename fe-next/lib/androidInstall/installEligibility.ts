/**
 * Platform gate for the persistent Android-install RE-ENTRY surfaces
 * (the header menu row and the session pill).
 *
 * Deliberately narrower than `shouldShowAndroidInstallPromo` in
 * `utils/androidApp.ts`: that gate also enforces cooldown / once-per-session /
 * route allowlist because it governs an UNSOLICITED auto-popup. The re-entry
 * surfaces are USER-INITIATED, so they stay available regardless of a prior
 * dismissal — we only filter out platforms where installing the native Android
 * app is impossible or pointless (desktop, iOS, the native shell, an installed
 * standalone PWA).
 */

import { isAndroidBrowser } from '@/utils/androidApp';

export interface InstallEntryInput {
  /** navigator.userAgent */
  ua: string;
  /** running inside the Capacitor native shell */
  isCapacitorNative: boolean;
  /** running as an installed standalone PWA */
  isStandalone: boolean;
}

export function isAndroidInstallEntryEligible(input: InstallEntryInput): boolean {
  if (input.isCapacitorNative) return false;
  if (input.isStandalone) return false;
  return isAndroidBrowser(input.ua);
}
