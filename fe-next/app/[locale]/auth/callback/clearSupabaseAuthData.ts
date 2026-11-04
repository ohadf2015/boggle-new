import Cookies from 'js-cookie';
import logger from '@/utils/logger';

/**
 * Clears all Supabase auth-related cookies and storage from the browser.
 * This allows the user to start fresh with a new sign-in attempt.
 */
export function clearSupabaseAuthData(): void {
  // Clear all cookies that start with 'sb-' (Supabase auth cookies)
  const allCookies = Cookies.get();
  Object.keys(allCookies).forEach((cookieName) => {
    if (cookieName.startsWith('sb-')) {
      Cookies.remove(cookieName, { path: '/' });
      // Also try removing with domain variations
      Cookies.remove(cookieName);
    }
  });

  // Clear Supabase-related items from localStorage and sessionStorage
  if (typeof window !== 'undefined') {
    const storageKeys = Object.keys(localStorage);
    storageKeys.forEach((key) => {
      if (key.startsWith('sb-') || key.includes('supabase')) {
        localStorage.removeItem(key);
      }
    });

    const sessionKeys = Object.keys(sessionStorage);
    sessionKeys.forEach((key) => {
      if (key.startsWith('sb-') || key.includes('supabase')) {
        sessionStorage.removeItem(key);
      }
    });
  }

  logger.log('Auth callback: Cleared Supabase auth data from browser');
}
