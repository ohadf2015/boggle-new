/**
 * Platform Detection Utility
 * Detects native vs web environment with graceful degradation.
 *
 * Uses globalThis.__CAPACITOR__ (set by Capacitor runtime) instead of
 * importing @capacitor/core directly, which causes Turbopack SWC helper
 * resolution failures in dev mode.
 */

 

function getCapacitor(): any {
  if (typeof globalThis !== 'undefined' && (globalThis as any).Capacitor) {
    return (globalThis as any).Capacitor;
  }
  return null;
}

/**
 * Check if running in native environment (iOS/Android via Capacitor)
 * @returns true if native, false if web or Capacitor unavailable
 */
export function isNative(): boolean {
  try {
    const cap = getCapacitor();
    return cap?.isNativePlatform?.() ?? false;
  } catch {
    return false;
  }
}

/**
 * Check if running on iOS native
 * @returns true if iOS native, false otherwise
 */
export function isIOS(): boolean {
  try {
    const cap = getCapacitor();
    return cap?.isNativePlatform?.() && cap?.getPlatform?.() === 'ios';
  } catch {
    return false;
  }
}

/**
 * Check if running on Android native
 * @returns true if Android native, false otherwise
 */
export function isAndroid(): boolean {
  try {
    const cap = getCapacitor();
    return cap?.isNativePlatform?.() && cap?.getPlatform?.() === 'android';
  } catch {
    return false;
  }
}

/**
 * Check if running in web environment
 * @returns true if web, false if native
 */
export function isWeb(): boolean {
  return !isNative();
}

/**
 * Check if running on a mobile device (native or mobile web browser)
 * Uses User-Agent heuristic for mobile web detection.
 * @returns true if mobile (native or mobile browser), false otherwise
 */
export function isMobile(): boolean {
  if (isNative()) return true;
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/**
 * Get current platform identifier
 * @returns 'ios' | 'android' | 'web'
 */
export function getPlatform(): 'ios' | 'android' | 'web' {
  try {
    const cap = getCapacitor();
    return (cap?.getPlatform?.() as 'ios' | 'android' | 'web') ?? 'web';
  } catch {
    return 'web';
  }
}
