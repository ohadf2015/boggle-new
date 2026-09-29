'use client';

/**
 * Eagerly loads the Google Identity Services client so soft-sheet / mp_sheet
 * Google CTAs are not an empty frame when the sheet opens.
 *
 * Heavy game paths skip GoogleOneTapInitializer (PSI unused-JS), so GSI was
 * only fetched when GoogleSignInButton mounted — too late for the first paint
 * of the signup sheet (t_375bffc3). This preloader mounts the script without
 * prompting One Tap.
 */

import Script from 'next/script';
import { useLanguage } from '@/contexts/LanguageContext';
import { isNative } from '@/utils/platform';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

export function GsiClientPreloader() {
  const { language } = useLanguage();
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  if (isNative() || !clientId) return null;

  return (
    <Script
      id="google-gsi-client-preload"
      src={`${GSI_SRC}?hl=${language}`}
      strategy="afterInteractive"
      data-testid="gsi-client-preload"
    />
  );
}

export default GsiClientPreloader;
