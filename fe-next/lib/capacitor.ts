/**
 * Capacitor Integration Utilities
 *
 * This module provides helper functions for Capacitor-specific functionality
 * including deep linking, app lifecycle handling, and platform-specific features.
 */

import { isMobile, getPlatform, Platform } from './config';

// Type definitions for Capacitor plugins
interface CapacitorApp {
  addListener: (event: string, callback: (data: unknown) => void) => { remove: () => void };
  getState: () => Promise<{ isActive: boolean }>;
  exitApp: () => Promise<void>;
}

interface CapacitorBrowser {
  open: (options: { url: string }) => Promise<void>;
  close: () => Promise<void>;
  addListener: (event: string, callback: (data: unknown) => void) => { remove: () => void };
}

interface CapacitorStatusBar {
  setStyle: (options: { style: 'dark' | 'light' }) => Promise<void>;
  setBackgroundColor: (options: { color: string }) => Promise<void>;
}

interface CapacitorKeyboard {
  addListener: (event: string, callback: (data: unknown) => void) => { remove: () => void };
  hide: () => Promise<void>;
}

interface CapacitorHaptics {
  impact: (options: { style: 'light' | 'medium' | 'heavy' }) => Promise<void>;
  notification: (options: { type: 'success' | 'warning' | 'error' }) => Promise<void>;
  vibrate: () => Promise<void>;
}

interface CapacitorSplashScreen {
  hide: () => Promise<void>;
  show: () => Promise<void>;
}

// Global Capacitor type
declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean;
      getPlatform: () => string;
    };
  }
}

/**
 * Check if the app is running in a Capacitor native shell
 */
export const isCapacitor = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!window.Capacitor?.isNativePlatform?.();
};

/**
 * Dynamically import a Capacitor plugin
 * Returns null if not running in Capacitor
 */
async function getPlugin<T>(pluginName: string): Promise<T | null> {
  if (!isCapacitor()) return null;

  try {
    const module = await import(`@capacitor/${pluginName.toLowerCase()}`);
    return module[pluginName] as T;
  } catch {
    console.warn(`[Capacitor] Plugin ${pluginName} not available`);
    return null;
  }
}

/**
 * Initialize Capacitor app lifecycle handlers
 * Call this once when the app mounts
 */
export async function initCapacitor(): Promise<void> {
  if (!isCapacitor()) return;

  console.log('[Capacitor] Initializing native features');

  const platform = getPlatform();

  // Hide splash screen after app is ready
  const SplashScreen = await getPlugin<CapacitorSplashScreen>('SplashScreen');
  if (SplashScreen) {
    await SplashScreen.hide();
  }

  // Configure status bar
  const StatusBar = await getPlugin<CapacitorStatusBar>('StatusBar');
  if (StatusBar) {
    await StatusBar.setStyle({ style: 'dark' });
    await StatusBar.setBackgroundColor({ color: '#111827' });
  }

  // Set up app state listener (for handling background/foreground)
  const App = await getPlugin<CapacitorApp>('App');
  if (App) {
    App.addListener('appStateChange', (state: unknown) => {
      const { isActive } = state as { isActive: boolean };
      console.log('[Capacitor] App state changed:', isActive ? 'active' : 'background');

      // Emit a custom event for other parts of the app to listen to
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('capacitor:appStateChange', { detail: { isActive } }));
      }
    });

    // Handle back button on Android
    if (platform === 'android') {
      App.addListener('backButton', () => {
        console.log('[Capacitor] Back button pressed');
        window.dispatchEvent(new CustomEvent('capacitor:backButton'));
      });
    }
  }

  // Handle keyboard events
  const Keyboard = await getPlugin<CapacitorKeyboard>('Keyboard');
  if (Keyboard) {
    Keyboard.addListener('keyboardWillShow', (info: unknown) => {
      window.dispatchEvent(new CustomEvent('capacitor:keyboardShow', { detail: info }));
    });

    Keyboard.addListener('keyboardWillHide', () => {
      window.dispatchEvent(new CustomEvent('capacitor:keyboardHide'));
    });
  }

  console.log('[Capacitor] Native features initialized');
}

/**
 * Trigger haptic feedback
 * Gracefully handles cases where haptics aren't available
 */
export async function hapticFeedback(
  type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light'
): Promise<void> {
  if (!isCapacitor()) return;

  const Haptics = await getPlugin<CapacitorHaptics>('Haptics');
  if (!Haptics) return;

  try {
    if (type === 'success' || type === 'warning' || type === 'error') {
      await Haptics.notification({ type });
    } else {
      await Haptics.impact({ style: type });
    }
  } catch (error) {
    console.warn('[Capacitor] Haptic feedback failed:', error);
  }
}

/**
 * Open a URL in the system browser
 * For OAuth flows, this opens the browser instead of an in-app WebView
 */
export async function openExternalBrowser(url: string): Promise<void> {
  if (!isCapacitor()) {
    // On web, just open in a new tab
    window.open(url, '_blank');
    return;
  }

  const Browser = await getPlugin<CapacitorBrowser>('Browser');
  if (Browser) {
    await Browser.open({ url });
  } else {
    // Fallback to window.open
    window.open(url, '_blank');
  }
}

/**
 * Close the external browser
 * Useful for OAuth callback handling
 */
export async function closeExternalBrowser(): Promise<void> {
  if (!isCapacitor()) return;

  const Browser = await getPlugin<CapacitorBrowser>('Browser');
  if (Browser) {
    await Browser.close();
  }
}

/**
 * Hide the keyboard
 * Useful when navigating or submitting forms
 */
export async function hideKeyboard(): Promise<void> {
  if (!isCapacitor()) return;

  const Keyboard = await getPlugin<CapacitorKeyboard>('Keyboard');
  if (Keyboard) {
    await Keyboard.hide();
  }
}

/**
 * Get the current app state
 */
export async function getAppState(): Promise<{ isActive: boolean }> {
  if (!isCapacitor()) {
    return { isActive: true };
  }

  const App = await getPlugin<CapacitorApp>('App');
  if (App) {
    return App.getState();
  }

  return { isActive: true };
}

/**
 * Safe area insets type
 */
export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Get safe area insets for the device
 * Returns zeros on web or if not available
 */
export function getSafeAreaInsets(): SafeAreaInsets {
  if (typeof window === 'undefined' || !isCapacitor()) {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  // Use CSS environment variables for safe area insets
  const style = getComputedStyle(document.documentElement);
  return {
    top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0', 10),
    bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0', 10),
    left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0', 10),
    right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0', 10),
  };
}

// Re-export platform utilities
export { isMobile, getPlatform, Platform };
