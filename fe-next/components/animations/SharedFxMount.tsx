'use client';

import { useEffect } from 'react';
import { SharedFxApp } from '@/lib/pixiFx/SharedFxApp';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { isNative } from '@/utils/platform';

/**
 * Mounts the SharedFxApp Pixi singleton once at app root so its consumers
 * (coin-earn streams, level-up celebrations, fireworks, boost FX) actually
 * render. Without this single mount, every `spawn*` call no-ops because
 * `app === null` — the silent regression that left those effects dead in prod.
 *
 * Skips on native (Capacitor) and under reduced-motion / zero particle budget.
 * On native this always-on fullscreen WebGL canvas (position:fixed; inset:0;
 * z-index:9999) composites as its own GPU surface in the Android WebView, which
 * can punch a see-through hole over the page (showing the navy/splash behind) —
 * invisible to DevTools but real on-screen. spawn* consumers degrade to
 * sound/DOM feedback, so native loses only the GPU particle layer.
 */
export const SharedFxMount: React.FC = () => {
  const { maxParticles, prefersReducedMotion } = useDevicePerformance();

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isNative()) return;
    if (prefersReducedMotion || maxParticles <= 0) return;

    SharedFxApp.mount(document.body, { maxParticles, prefersReducedMotion }).catch(() => {
      // mount is best-effort; a failed GPU init must never break the app shell.
    });

    return () => {
      SharedFxApp.unmount();
    };
  }, [maxParticles, prefersReducedMotion]);

  return null;
};

export default SharedFxMount;
