'use client';

import { useEffect } from 'react';

const ANDROID_PACKAGE = 'live.lexiclash.app';
const SESSION_FLAG = 'android_app_redirect_tried';
const DISMISS_KEY = 'android_app_redirect_dismissed_until';
const DISMISS_DAYS = 7;

function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

function isAndroidChrome(ua: string): boolean {
  if (!/Android/i.test(ua)) return false;
  if (/wv\)|; wv\)/.test(ua)) return false;
  if (/FBAN|FBAV|Instagram|Line\/|TikTok|MicroMessenger/i.test(ua)) return false;
  return true;
}

export default function AndroidAppRedirect() {
  useEffect(() => {
    if (isCapacitorNative()) return;
    if (!isAndroidChrome(navigator.userAgent)) return;

    if (sessionStorage.getItem(SESSION_FLAG)) return;
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) return;

    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const { host, pathname, search, hash } = window.location;
    const fallback = `https://${host}${pathname}${search}${hash}`;
    const intentUrl =
      `intent://${host}${pathname}${search}${hash}` +
      `#Intent;scheme=https;package=${ANDROID_PACKAGE};` +
      `S.browser_fallback_url=${encodeURIComponent(fallback)};end`;

    sessionStorage.setItem(SESSION_FLAG, '1');
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86_400_000));

    window.location.href = intentUrl;
  }, []);

  return null;
}
