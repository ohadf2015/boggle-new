'use client';

import { useEffect } from 'react';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { useCelebrationIntensity } from '@/contexts/AccessibilityContext';
import { isCelebrationSuppressed } from '@/lib/cosy/celebrationScale';
import { isNative } from '@/utils/platform';

/**
 * Mounts the SharedFxApp Pixi singleton once at app root so its consumers
 * (coin-earn streams, level-up celebrations, fireworks, boost FX) actually
 * render. Without this single mount, every `spawn*` call no-ops because
 * `app === null` — the silent regression that left those effects dead in prod.
 *
 * SharedFxApp (and through it pixi.js — ~254KB gzip, ~856KB parsed) is behind a
 * DYNAMIC import on purpose. This component mounts at app root on every route, so
 * a static import shipped the whole WebGL engine to every page load and compiled
 * it before the guards below could decide not to use it. Measured 2026-07-25: that
 * chunk was the single largest script on `practice/wordHunt`, a route with no Pixi
 * gameplay at all. Keep the import inside the effect, after the guards.
 *
 * Skips on native (Capacitor), on low-end devices, and under reduced-motion /
 * zero particle budget.
 * On native this always-on fullscreen WebGL canvas (position:fixed; inset:0;
 * z-index:9999) composites as its own GPU surface in the Android WebView, which
 * can punch a see-through hole over the page (showing the navy/splash behind) —
 * invisible to DevTools but real on-screen. spawn* consumers degrade to
 * sound/DOM feedback, so native loses only the GPU particle layer.
 */
export const SharedFxMount: React.FC = () => {
  const { maxParticles, prefersReducedMotion, isLowEnd } = useDevicePerformance();
  // Cosy / Calm Mode (calm tier) replaces particle celebrations with quiet
  // feedback, so the always-on GPU particle layer must not even mount — no
  // coin streams, level-up bursts, or fireworks. 'gentle' (non-cosy reduce
  // effects) keeps the layer; only 'calm' suppresses it entirely.
  const fxSuppressed = isCelebrationSuppressed(useCelebrationIntensity());

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isNative()) return;
    if (prefersReducedMotion || maxParticles <= 0 || fxSuppressed) return;
    // A low-end phone cannot afford a fullscreen WebGL context for decorative
    // sparkles. Bail before the import so it never pays for the engine either.
    // The runtime frame watcher can flip this mid-session, which re-runs this
    // effect and tears the layer down.
    if (isLowEnd) return;

    let cancelled = false;
    let loaded: typeof import('@/lib/pixiFx/SharedFxApp') | null = null;

    void (async () => {
      const mod = await import('@/lib/pixiFx/SharedFxApp');
      if (cancelled) return;
      loaded = mod;
      await mod.SharedFxApp.mount(document.body, { maxParticles, prefersReducedMotion });
    })().catch(() => {
      // mount is best-effort; a failed GPU init must never break the app shell.
    });

    return () => {
      cancelled = true;
      // Null when cleanup beat the import — nothing was mounted, nothing to release.
      loaded?.SharedFxApp.unmount();
    };
  }, [maxParticles, prefersReducedMotion, fxSuppressed, isLowEnd]);

  return null;
};

export default SharedFxMount;
