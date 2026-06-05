'use client';

/**
 * Repaint the Capacitor WebView whenever the app returns to the foreground.
 *
 * WHY: AdMob interstitial & rewarded ads are fullscreen native Android
 * Activities composited OVER the WebView. On dismiss, the WebView Activity
 * resumes but can fail to re-acquire + repaint its GPU surface, leaving a blank
 * frame on top of the still-mounted React tree ("the ad shows, then the page is
 * blank"). No DOM mutation and no JS error occur, so it never reaches Sentry and
 * only happens on native.
 *
 * The per-ad `kickWebViewRepaint()` already runs inside each ad's `Dismissed`
 * listener — but that fires mid-teardown, while the WebView's requestAnimationFrame
 * can still be throttled/dropped (the SurfaceView is still composited over us), so
 * the repaint can land on a surface that hasn't reattached yet. This hook adds the
 * missing trigger: repaint on the actual `appStateChange -> isActive` RESUME, when
 * the surface is reattached and rAF runs normally. Defense in depth — the two kicks
 * are complementary, both cheap (an invisible translateZ(0) toggle).
 *
 * Mirrors BannerCoordinatorMount, which reasserts the banner on the same
 * foreground event for the same GPU-surface-recovery reason — empirical evidence
 * in this codebase that a dismissing ad Activity fires `appStateChange`.
 */

import { useAppLifecycle } from './useAppLifecycle';
import { kickWebViewRepaint } from '../lib/native/webviewRepaint';

export function useWebViewRepaintOnResume(): void {
  useAppLifecycle({
    onForeground: () => {
      kickWebViewRepaint();
    },
  });
}

export default useWebViewRepaintOnResume;
