'use client';

import { useEffect } from 'react';
import {
  ANDROID_PACKAGE,
  hasLexiClashInstalled,
  isAndroidBrowser,
  isCapacitorNative,
  isStandaloneDisplay,
} from '@/utils/androidApp';

const SESSION_FLAG = 'android_app_redirect_tried';
const DISMISS_KEY = 'android_app_redirect_dismissed_until';
const DISMISS_DAYS = 7;

export default function AndroidAppRedirect() {
  useEffect(() => {
    if (isCapacitorNative()) return;
    if (!isAndroidBrowser(navigator.userAgent)) return;

    if (sessionStorage.getItem(SESSION_FLAG)) return;
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) return;

    if (isStandaloneDisplay()) return;

    let cancelled = false;
    void hasLexiClashInstalled().then((installed) => {
      if (cancelled || !installed) return;

      const { host, pathname, search, hash } = window.location;
      const fallback = `https://${host}${pathname}${search}${hash}`;
      const intentUrl =
        `intent://${host}${pathname}${search}${hash}` +
        `#Intent;scheme=https;package=${ANDROID_PACKAGE};` +
        `S.browser_fallback_url=${encodeURIComponent(fallback)};end`;

      sessionStorage.setItem(SESSION_FLAG, '1');
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86_400_000));

      window.location.href = intentUrl;
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
