/**
 * Native OAuth Utility
 * Handles OAuth authentication using native platform SDKs via @capgo/capacitor-social-login
 *
 * This approach:
 * - Uses native Google/Apple sign-in dialogs (no browser involved)
 * - Gets an ID token from the native SDK
 * - Exchanges it with Supabase via signInWithIdToken()
 * - User never leaves the app
 *
 * IMPORTANT: Requires @capgo/capacitor-social-login plugin to be installed and configured.
 * See: https://capgo.app/blog/setup-supabase-with-capacitor-social-login/
 */

import { supabase } from '@/lib/supabase';
import { isNative, isIOS, isAndroid } from '@/utils/platform';
import logger from '@/utils/logger';

export interface NativeOAuthResult {
  success: boolean;
  error?: string;
}

// Configuration for native OAuth providers
// These must be configured in your Google Cloud Console and Apple Developer Console
interface NativeOAuthConfig {
  google: {
    webClientId: string;  // Web Client ID from Google Cloud Console (used for Android too)
  };
  apple: Record<string, never>;  // Apple doesn't need config on iOS
}

// Load config from environment variables
const getNativeOAuthConfig = (): NativeOAuthConfig | null => {
  const webClientId = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  if (!webClientId) {
    logger.warn('[NativeOAuth] NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID not configured');
    return null;
  }

  return {
    google: { webClientId },
    apple: {}
  };
};

let socialLoginInitialized = false;
let SocialLogin: typeof import('@capgo/capacitor-social-login').SocialLogin | null = null;

/**
 * Initialize the Social Login plugin
 * Must be called before using native OAuth
 */
export async function initializeNativeOAuth(): Promise<boolean> {
  if (!isNative()) {
    logger.log('[NativeOAuth] Not native platform, skipping initialization');
    return false;
  }

  if (socialLoginInitialized) {
    return true;
  }

  const config = getNativeOAuthConfig();
  if (!config) {
    logger.error('[NativeOAuth] Configuration not available');
    return false;
  }

  try {
    // Dynamically import to avoid issues on web builds
    const socialLoginModule = await import('@capgo/capacitor-social-login');
    SocialLogin = socialLoginModule.SocialLogin;

    // Build provider config based on platform
    // Note: Use 'online' mode to get idToken directly, which is needed for signInWithIdToken
    // 'offline' mode returns serverAuthCode instead, which requires server-side token exchange
    // Apple Sign-In is only supported on iOS - Android requires a redirectUrl that we don't have
    const providerConfig: { google: { webClientId: string; mode: 'online' }; apple?: Record<string, never> } = {
      google: {
        webClientId: config.google.webClientId,
        mode: 'online'  // Returns idToken and accessToken directly
      },
    };

    // Only add Apple config on iOS - on Android it throws "redirectUrl is null or empty" error
    if (isIOS()) {
      providerConfig.apple = {};  // No config needed for iOS
    }

    await SocialLogin.initialize(providerConfig);

    socialLoginInitialized = true;
    logger.log('[NativeOAuth] Successfully initialized');
    return true;
  } catch (error) {
    // Handle expected errors gracefully without reporting to Sentry
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Android Apple redirect URL error is expected - Apple Sign-In isn't configured for Android
    if (errorMessage.includes('redirectUrl is null or empty') || errorMessage.includes('apple.android')) {
      logger.warn('[NativeOAuth] Apple Sign-In not configured for Android (expected) - Google Sign-In still available');
      // Still mark as initialized - Google Sign-In should work
      socialLoginInitialized = true;
      return true;
    }

    logger.error('[NativeOAuth] Failed to initialize:', error);
    return false;
  }
}

/**
 * Check if native OAuth is available for the current platform
 */
export function isNativeOAuthAvailable(): boolean {
  return isNative() && socialLoginInitialized && SocialLogin !== null;
}

/**
 * Perform Google sign-in using native SDK
 * Returns the result - on success, Supabase session is automatically created
 */
export async function signInWithGoogleNative(): Promise<NativeOAuthResult> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  if (!isNativeOAuthAvailable()) {
    return { success: false, error: 'Native OAuth not available' };
  }

  if (!SocialLogin) {
    return { success: false, error: 'SocialLogin not initialized' };
  }

  try {
    logger.log('[NativeOAuth] Starting Google native sign-in');

    // Perform native Google sign-in
    const result = await SocialLogin.login({
      provider: 'google',
      options: {
        scopes: ['email', 'profile']
      }
    });

    // Type guard for online response (contains idToken)
    const googleResult = result.result;
    if (!googleResult || googleResult.responseType !== 'online') {
      logger.error('[NativeOAuth] Unexpected Google response type (expected online)');
      return { success: false, error: 'Unexpected response type from Google' };
    }

    const idToken = googleResult.idToken;
    if (!idToken) {
      logger.error('[NativeOAuth] No ID token received from Google');
      return { success: false, error: 'No ID token received from Google' };
    }

    logger.log('[NativeOAuth] Got Google ID token, exchanging with Supabase');

    // Exchange ID token with Supabase
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken
    });

    if (error) {
      logger.error('[NativeOAuth] Supabase signInWithIdToken error:', error);
      return { success: false, error: error.message };
    }

    if (!data.session) {
      return { success: false, error: 'No session created' };
    }

    logger.log('[NativeOAuth] Google sign-in successful');
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[NativeOAuth] Google sign-in error:', error);

    // Handle user cancellation
    if (errorMessage.includes('cancel') || errorMessage.includes('CANCELED')) {
      return { success: false, error: 'Sign in cancelled' };
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Perform Apple sign-in using native SDK (iOS only)
 * Returns the result - on success, Supabase session is automatically created
 */
export async function signInWithAppleNative(): Promise<NativeOAuthResult> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  // Apple Sign In is only available natively on iOS
  if (!isIOS()) {
    return { success: false, error: 'Apple Sign In only available on iOS' };
  }

  if (!isNativeOAuthAvailable()) {
    return { success: false, error: 'Native OAuth not available' };
  }

  if (!SocialLogin) {
    return { success: false, error: 'SocialLogin not initialized' };
  }

  try {
    logger.log('[NativeOAuth] Starting Apple native sign-in');

    // Perform native Apple sign-in
    const result = await SocialLogin.login({
      provider: 'apple',
      options: {
        scopes: ['email', 'name']
      }
    });

    const idToken = result.result?.idToken;
    if (!idToken) {
      logger.error('[NativeOAuth] No ID token received from Apple');
      return { success: false, error: 'No ID token received from Apple' };
    }

    logger.log('[NativeOAuth] Got Apple ID token, exchanging with Supabase');

    // Exchange ID token with Supabase
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: idToken
    });

    if (error) {
      logger.error('[NativeOAuth] Supabase signInWithIdToken error:', error);
      return { success: false, error: error.message };
    }

    if (!data.session) {
      return { success: false, error: 'No session created' };
    }

    // Apple only provides the user's name on first sign-in
    // Store it in user metadata if available
    if (result.result?.profile) {
      const { givenName, familyName } = result.result.profile;
      if (givenName || familyName) {
        const fullName = [givenName, familyName].filter(Boolean).join(' ');
        await supabase.auth.updateUser({
          data: {
            full_name: fullName,
            given_name: givenName,
            family_name: familyName
          }
        });
      }
    }

    logger.log('[NativeOAuth] Apple sign-in successful');
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[NativeOAuth] Apple sign-in error:', error);

    // Handle user cancellation
    if (errorMessage.includes('cancel') || errorMessage.includes('ERR_REQUEST_CANCELED')) {
      return { success: false, error: 'Sign in cancelled' };
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Perform native OAuth sign-in for the specified provider
 * Falls back to browser-based OAuth if native is not available
 */
export async function performNativeOAuth(
  provider: 'google' | 'apple'
): Promise<NativeOAuthResult> {
  // Initialize if not already done
  if (!socialLoginInitialized) {
    const initialized = await initializeNativeOAuth();
    if (!initialized) {
      logger.log('[NativeOAuth] Native OAuth not available, will use fallback');
      return { success: false, error: 'Native OAuth not available' };
    }
  }

  switch (provider) {
    case 'google':
      return signInWithGoogleNative();
    case 'apple':
      return signInWithAppleNative();
    default:
      return { success: false, error: `Unsupported provider: ${provider}` };
  }
}

/**
 * Log out from native social login providers
 */
export async function logoutFromNativeProviders(): Promise<void> {
  if (!isNativeOAuthAvailable() || !SocialLogin) {
    return;
  }

  try {
    // Log out from all providers
    await Promise.all([
      SocialLogin.logout({ provider: 'google' }).catch(() => {}),
      SocialLogin.logout({ provider: 'apple' }).catch(() => {})
    ]);
  } catch (error) {
    logger.warn('[NativeOAuth] Error during logout:', error);
  }
}
