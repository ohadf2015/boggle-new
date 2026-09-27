'use client';

import { useEffect } from 'react';
import { isNative } from '@/utils/platform';
import { initializeNativeOAuth } from '@/utils/nativeOAuth';
import logger from '@/utils/logger';

/**
 * NativeOAuthInitializer Component
 *
 * Initializes native OAuth (Google Sign-In, Apple Sign-In) on app start.
 * This enables the native sign-in dialogs to be ready when the user
 * wants to authenticate, providing a seamless experience.
 *
 * Only runs on Capacitor (mobile) platforms.
 *
 * @example
 * // Add to root layout:
 * <NativeOAuthInitializer />
 */
export default function NativeOAuthInitializer() {
  useEffect(() => {
    // Only initialize on native platforms
    if (!isNative()) {
      return;
    }

    // Initialize native OAuth in the background
    // Don't block app startup - auth will initialize when needed if this fails
    initializeNativeOAuth()
      .then(success => {
        if (success) {
          logger.log('[NativeOAuthInitializer] Native OAuth ready');
        } else {
          logger.log('[NativeOAuthInitializer] Native OAuth not available, will use browser fallback');
        }
      })
      .catch(error => {
        // Non-fatal - browser OAuth will be used as fallback
        logger.debug('[NativeOAuthInitializer] Failed to initialize:', error);
      });
  }, []);

  // This component doesn't render anything
  return null;
}
