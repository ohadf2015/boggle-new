/**
 * Mobile OAuth Utility
 * Handles OAuth authentication flow for Capacitor native apps using in-app browser.
 * Uses globalThis.Capacitor to avoid any @capacitor/* imports that break Turbopack.
 */

 

import { supabase } from '@/lib/supabase';
import { isNative } from '@/utils/platform';
import { defaultLocale, locales } from '@/lib/i18n';
import logger from '@/utils/logger';

export interface MobileOAuthResult {
  success: boolean;
  error?: string;
}

function getCurrentLocale(): string {
  if (typeof window === 'undefined') return defaultLocale;
  const pathSegments = window.location.pathname.split('/').filter(Boolean);
  const firstSegment = pathSegments[0];
  if (firstSegment && locales.includes(firstSegment)) {
    return firstSegment;
  }
  return defaultLocale;
}

function getCapacitor(): any {
  return (globalThis as any).Capacitor ?? null;
}

function getOAuthRedirectUrl(locale: string): string {
  const cap = getCapacitor();
  const platform = cap?.getPlatform?.() ?? 'web';

  if (platform === 'android') {
    return `https://www.lexiclash.live/${locale}/auth/callback?from_app=true`;
  } else {
    return `lexiclash://auth/callback${locale ? `?locale=${locale}` : ''}`;
  }
}

export async function performMobileOAuth(
  provider: 'google' | 'discord'
): Promise<MobileOAuthResult> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  if (!isNative()) {
    return { success: false, error: 'Not running in native environment' };
  }

  const currentLocale = getCurrentLocale();
  const redirectTo = getOAuthRedirectUrl(currentLocale);

  try {
    logger.log(`[MobileOAuth] Starting ${provider} OAuth with redirect: ${redirectTo}`);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      logger.error('[MobileOAuth] Failed to get OAuth URL:', error);
      return { success: false, error: error.message };
    }

    if (!data?.url) {
      logger.error('[MobileOAuth] No OAuth URL returned');
      return { success: false, error: 'No OAuth URL returned' };
    }

    logger.log('[MobileOAuth] Opening in-app browser for OAuth');

    const BrowserPlugin = getCapacitor()?.Plugins?.Browser;
    if (BrowserPlugin) {
      await BrowserPlugin.open({
        url: data.url,
        presentationStyle: 'popover',
        windowName: '_self',
      });
    }

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error during OAuth';
    logger.error('[MobileOAuth] OAuth error:', err);
    return { success: false, error: errorMessage };
  }
}

export async function closeMobileOAuthBrowser(): Promise<void> {
  if (!isNative()) return;

  try {
    const BrowserPlugin = getCapacitor()?.Plugins?.Browser;
    if (BrowserPlugin) await BrowserPlugin.close();
  } catch (err) {
    logger.log('[MobileOAuth] Browser close (may already be closed):', err);
  }
}

export async function listenForOAuthCallback(
  onCallback: (url: string) => void
): Promise<() => void> {
  if (!isNative()) {
    return () => {};
  }

  const AppPlugin = getCapacitor()?.Plugins?.App;
  if (!AppPlugin) return () => {};

  const listener = await Promise.resolve(AppPlugin.addListener('appUrlOpen', (event: { url: string }) => {
    if (event.url.includes('auth/callback')) {
      logger.log('[MobileOAuth] Received OAuth callback:', event.url);
      onCallback(event.url);
    }
  }));

  return () => {
    listener.remove();
  };
}
