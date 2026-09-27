'use client';

import { useEffect } from 'react';
import { isNative } from '@/utils/platform';

/**
 * Tags <html> with `lexi-native` while running inside the Capacitor app.
 *
 * The native webview otherwise treats every UI label and the logo as
 * selectable text/images, so a long-press pops the Android Translate/Copy/Share
 * callout over the chrome — it looks broken (see the settings screen). Global
 * CSS keys off `html.lexi-native` to disable user-select / touch-callout, while
 * web keeps normal selection for content & SEO pages. Inputs and any element
 * tagged `[data-selectable]` (e.g. room codes) stay selectable via the CSS.
 *
 * Mounted once at app root (essential-providers), mirroring SharedFxMount.
 */
export const NativeSelectionGuard: React.FC = () => {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!isNative()) return; // web: leave selection untouched

    const root = document.documentElement;
    root.classList.add('lexi-native');
    return () => {
      root.classList.remove('lexi-native');
    };
  }, []);

  return null;
};

export default NativeSelectionGuard;
